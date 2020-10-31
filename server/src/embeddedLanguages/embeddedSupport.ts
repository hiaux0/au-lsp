/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as parse5 from "parse5";
import * as SaxStream from "parse5-sax-parser";
import {
  Position,
  LanguageService,
  TokenType,
  Range,
  Scanner,
} from "./languageModes";
import { AURELIA_ATTRIBUTES_KEYWORDS } from "../configuration/DocumentSettings";
import { TextDocument } from "vscode-languageserver-textdocument";
import { AureliaView } from "../common/constants";
import { aureliaProgram } from "../viewModel/AureliaProgram";

export interface LanguageRange extends Range {
  languageId: string | undefined;
  attributeValue?: boolean;
}

export interface HTMLDocumentRegions {
  getEmbeddedDocument(
    languageId: string,
    ignoreAttributeValues?: boolean
  ): TextDocument;
  getLanguageRanges(range: Range): LanguageRange[];
  getLanguageAtPosition(position: Position): string | undefined;
  getLanguagesInDocument(): string[];
  getImportedScripts(): string[];
  getRegionAtPosition(position: Position): EmbeddedRegion | undefined;
}

export const CSS_STYLE_RULE = "__";

export interface EmbeddedRegion {
  languageId: string | undefined;
  start: number;
  end: number;
  attributeValue?: boolean;
  tagName?: string;
}

enum ViewRegionType {
  Attribute = "Attribute",
  AttributeInterpolation = "AttributeInterpolation",
  TextInterpolation = "TextInterpolation",
  CustomElement = "CustomElement",
}

export interface ViewRegionInfo {
  type: ViewRegionType;
  languageId: string;
  start?: number;
  end?: number;
  attributeName?: string;
  tagName?: string;
}

interface ViewRegions {
  interpolatedRegions: ViewRegionInfo[];
  customElementRegions: ViewRegionInfo[];
}

export const aureliaLanguageId = "aurelia";

export function getDocumentRegionsV2(
  document: TextDocument
): Promise<ViewRegionInfo[]> {
  return new Promise((resolve) => {
    const saxStream = new SaxStream({ sourceCodeLocationInfo: true });
    const viewRegions: ViewRegionInfo[] = [];
    const interpolationRegex = /\$(?:\s*)\{(?!\s*`)(?<interpolationValue>.*?)\}/g;

    const aureliaCustomElementNames = aureliaProgram.componentList.map(
      (component) => component.viewModelName
    );

    // 1. Check if in <template>
    let hasTemplateTag = false;

    saxStream.on("startTag", (startTag) => {
      const { tagName } = startTag;
      const isTemplateTag = tagName === AureliaView.TEMPLATE_TAG_NAME;
      if (isTemplateTag) {
        hasTemplateTag = true;
      }

      if (!hasTemplateTag) return;

      // Attributes and Interpolation
      startTag.attrs.forEach((attr) => {
        // Attributes
        const isAttributeKeyword = AURELIA_ATTRIBUTES_KEYWORDS.some(
          (keyword) => {
            return attr.name.includes(keyword);
          }
        );
        if (isAttributeKeyword) {
          const viewRegion = createRegionV2({
            attributeName: attr.name,
            sourceCodeLocation: startTag.sourceCodeLocation?.attrs[attr.name], // TODO: Currently we get the whole attribute, and not just its value (>click.delegate=""<, instead of just >""<)
            type: ViewRegionType.Attribute,
          });
          viewRegions.push(viewRegion);
        } else {
          // Interpolation
          const interpolationMatch = interpolationRegex.exec(attr.value);
          if (interpolationMatch !== null) {
            const attrLocation = startTag.sourceCodeLocation?.attrs[attr.name];
            if (!attrLocation) return;

            /** Eg. >css="width: ${<message}px;" */
            const startInterpolationLength =
              attr.name.length + // css
              2 + // ="
              interpolationMatch.index + // width:_
              2; // ${

            /** Eg. >css="width: ${message}<px;" */
            const endInterpolationLength =
              attrLocation.startOffset +
              startInterpolationLength +
              Number(interpolationMatch.groups?.interpolationValue.length) + // message
              1; // }

            const updatedLocation: parse5.Location = {
              ...attrLocation,
              startOffset: attrLocation.startOffset + startInterpolationLength,
              endOffset: endInterpolationLength,
            };

            const viewRegion = createRegionV2({
              attributeName: attr.name,
              sourceCodeLocation: updatedLocation,
              type: ViewRegionType.AttributeInterpolation,
            });
            viewRegions.push(viewRegion);
          }
        }
      });

      // Custom elements
      const isCustomElement = aureliaCustomElementNames.includes(tagName);
      if (isCustomElement) {
        const viewRegion = createRegionV2({
          tagName,
          sourceCodeLocation: startTag.sourceCodeLocation,
          type: ViewRegionType.CustomElement,
        });
        viewRegions.push(viewRegion);
      }
    });

    saxStream.on("text", (text) => {
      const interpolationMatch = interpolationRegex.exec(text.text);
      if (interpolationMatch !== null) {
        text;
        const attrLocation = text.sourceCodeLocation;
        if (!attrLocation) return;

        /** Eg. \n\n  ${grammarRules.length} */
        const startInterpolationLength =
          interpolationMatch.index + // width:_
          2; // ${

        /** Eg. >css="width: ${message}<px;" */
        const endInterpolationLength =
          attrLocation.startOffset +
          startInterpolationLength +
          Number(interpolationMatch.groups?.interpolationValue.length) + // message
          1; // }

        const updatedLocation: parse5.Location = {
          ...attrLocation,
          startOffset: attrLocation.startOffset + startInterpolationLength,
          endOffset: endInterpolationLength,
        };

        const viewRegion = createRegionV2({
          sourceCodeLocation: updatedLocation,
          type: ViewRegionType.TextInterpolation,
        });
        viewRegions.push(viewRegion);
      }
    });

    saxStream.on("endTag", (endTag) => {
      const isTemplateTag = endTag.tagName === AureliaView.TEMPLATE_TAG_NAME;
      if (isTemplateTag) {
        resolve(viewRegions);
      }
    });

    saxStream.write(document.getText());
  });
}

function createRegionV2({
  sourceCodeLocation,
  type,
  attributeName,
  tagName,
  languageId = aureliaLanguageId,
}: {
  sourceCodeLocation:
    | SaxStream.StartTagToken["sourceCodeLocation"]
    | parse5.AttributesLocation[string];
  type: ViewRegionType;
  attributeName?: string;
  tagName?: string;
  languageId?: string;
}) {
  let calculatedStart = sourceCodeLocation?.startOffset;
  let calculatedEnd = sourceCodeLocation?.endOffset;
  if (attributeName) {
    // calSt + "attrName" + '=
    calculatedStart = calculatedStart! + attributeName.length + 2;
    // - '"'
    calculatedEnd = calculatedEnd! - 1; // I thought It should be -1, but why -2 here?
  }

  return {
    type,
    languageId,
    start: calculatedStart,
    end: calculatedEnd,
    attributeName,
    tagName,
  };
}

export function getDocumentRegions(
  languageService: LanguageService,
  document: TextDocument
): HTMLDocumentRegions {
  let regions: EmbeddedRegion[] = [];
  let scanner = languageService.createScanner(document.getText());
  let lastTagName: string = "";
  let lastAttributeName: string | null = null;
  let languageIdFromType: string | undefined = undefined;
  let importedScripts: string[] = [];
  let counter = 0;

  let token = scanner.scan();
  // [1.] token parsing
  while (token !== TokenType.EOS) {
    switch (token) {
      case TokenType.StartTag:
        lastTagName = scanner.getTokenText();
        lastAttributeName = null;
        languageIdFromType = "javascript";
        break;
      case TokenType.StartTagClose: {
        if (lastTagName === "my-compo") {
          const aureliaRegion = createRegion(
            scanner,
            document,
            aureliaLanguageId,
            lastTagName
          );
          regions.push(aureliaRegion);
        }
      }
      case TokenType.Styles:
        // regions.push({ languageId: 'typescript', start: scanner.getTokenOffset(), end: scanner.getTokenEnd() });
        // regions.push({ languageId: 'javascript', start: scanner.getTokenOffset(), end: scanner.getTokenEnd() });
        regions.push({
          languageId: "css",
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd(),
        });
        break;
      case TokenType.Script:
        // // console.log(">>>>>>>>>>>>>>>>>> \TCL: TokenType.Script:", TokenType.Script)
        regions.push({
          languageId: languageIdFromType,
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd(),
        });
        // regions.push({ languageId: 'javascript', start: scanner.getTokenOffset(), end: scanner.getTokenEnd() });
        break;
      case TokenType.AttributeName:
        lastAttributeName = scanner.getTokenText();
        break;
      case TokenType.AttributeValue:
        let value = scanner.getTokenText();
        // // console.log("TCL: value", value)

        if (
          lastAttributeName === "src" &&
          lastTagName.toLowerCase() === "script"
        ) {
          // // // console.log("TCL: value", value)
          if (value[0] === "'" || value[0] === '"') {
            value = value.substr(1, value.length - 1);
          }
          importedScripts.push(value);
        } else if (
          lastAttributeName === "type" &&
          lastTagName.toLowerCase() === "script"
        ) {
          if (
            /["'](module|(text|application)\/(java|ecma)script|text\/babel)["']/.test(
              scanner.getTokenText()
            )
          ) {
            languageIdFromType = "javascript";
          } else if (/["']text\/typescript["']/.test(scanner.getTokenText())) {
            languageIdFromType = "typescript";
            // console.log('BIIIIIIIIIIIIIIIIIIIIINNNNNNNNNNNNNNNGOOOOOOOOO______________+++++')
          } else {
            languageIdFromType = undefined;
          }
        } else {
          let attributeLanguageId = getAttributeLanguage(lastAttributeName!);
          if (attributeLanguageId) {
            let start = scanner.getTokenOffset();
            let end = scanner.getTokenEnd();
            let firstChar = document.getText()[start];
            if (firstChar === "'" || firstChar === '"') {
              start++;
              end--;
            }
            // regions.push({ languageId: 'javascript', start, end, attributeValue: true });
            regions.push({
              languageId: attributeLanguageId,
              start,
              end,
              attributeValue: true,
            });
          }
        }

        // console.log("TCL: lastAttributeName", lastAttributeName)
        const isAttributeKeyword = AURELIA_ATTRIBUTES_KEYWORDS.some(
          (keyword) => {
            return lastAttributeName?.includes(keyword);
          }
        );

        if (isAttributeKeyword) {
          // console.log('>>> SET TS REGION <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
          // console.log('>>> SET TS REGION <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
          // console.log('>>> SET TS REGION <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
          let start = scanner.getTokenOffset();
          // console.log("TCL: start", start)
          let end = scanner.getTokenEnd();
          // console.log("TCL: end", end)
          let firstChar = document.getText()[start];
          // console.log("TCL: firstChar", firstChar)
          if (firstChar === "'" || firstChar === '"') {
            start++;
            end--;
          }
          regions.push({
            languageId: aureliaLanguageId,
            start,
            end,
            attributeValue: true,
          });
        }

        lastAttributeName = null;
        break;
    }
    // // // console.log("TCL: token", token)
    // // // console.log("TCL: lastTagName", lastTagName)
    // // // console.log("TCL: lastAttributeName", lastAttributeName)
    // // console.log("TCL: regions", regions)
    token = scanner.scan();
    // // console.log('END ------------------------------------------------------------------------------------------')
    counter++;
  }
  // // // console.log("TCL: counter", counter)
  return {
    getLanguageRanges: (range: Range) =>
      getLanguageRanges(document, regions, range),
    getEmbeddedDocument: (languageId: string, ignoreAttributeValues: boolean) =>
      getEmbeddedDocument(document, regions, languageId, ignoreAttributeValues),
    getLanguageAtPosition: (position: Position) =>
      getLanguageAtPosition(document, regions, position),
    getLanguagesInDocument: () => getLanguagesInDocument(document, regions),
    getImportedScripts: () => importedScripts,
    getRegionAtPosition: (position: Position) =>
      getRegionAtPosition(document, regions, position),
  };
}

function getLanguageRanges(
  document: TextDocument,
  regions: EmbeddedRegion[],
  range: Range
): LanguageRange[] {
  let result: LanguageRange[] = [];
  let currentPos = range ? range.start : Position.create(0, 0);
  let currentOffset = range ? document.offsetAt(range.start) : 0;
  let endOffset = range
    ? document.offsetAt(range.end)
    : document.getText().length;
  for (let region of regions) {
    if (region.end > currentOffset && region.start < endOffset) {
      let start = Math.max(region.start, currentOffset);
      let startPos = document.positionAt(start);
      if (currentOffset < region.start) {
        result.push({
          start: currentPos,
          end: startPos,
          languageId: "html",
        });
      }
      let end = Math.min(region.end, endOffset);
      let endPos = document.positionAt(end);
      if (end > region.start) {
        result.push({
          start: startPos,
          end: endPos,
          languageId: region.languageId,
          attributeValue: region.attributeValue,
        });
      }
      currentOffset = end;
      currentPos = endPos;
    }
  }
  if (currentOffset < endOffset) {
    let endPos = range ? range.end : document.positionAt(endOffset);
    result.push({
      start: currentPos,
      end: endPos,
      languageId: "html",
    });
  }
  return result;
}

function getLanguagesInDocument(
  _document: TextDocument,
  regions: EmbeddedRegion[]
): string[] {
  // // // console.log("TCL: regions", regions)
  let result = [];
  for (let region of regions) {
    if (region.languageId && result.indexOf(region.languageId) === -1) {
      result.push(region.languageId);
      if (result.length === 3) {
        return result;
      }
    }
  }
  result.push("html");
  return result;
}

// [2.] Offset in region check
function getLanguageAtPosition(
  document: TextDocument,
  regions: EmbeddedRegion[],
  position: Position
): string | undefined {
  let offset = document.offsetAt(position);
  // // console.log("TCL: offset", offset)
  for (let region of regions) {
    // // console.log("TCL: region", region)
    if (region.start <= offset) {
      if (offset <= region.end) {
        // // console.log("TCL: region.languageId", region.languageId)
        return region.languageId;
      }
    } else {
      break;
    }
  }
  return "html";
}

export function getRegionAtPositionV2(
  document: TextDocument,
  regions: ViewRegionInfo[],
  position: Position
): ViewRegionInfo | undefined {
  let offset = document.offsetAt(position);
  for (let region of regions) {
    if (region.start! <= offset) {
      if (offset <= region.end!) {
        return region;
      }
    } else {
      break;
    }
  }

  console.error("embeddedSupport -> getRegionAtPosition -> No Region found");
  return undefined;
}

export function getRegionAtPosition(
  document: TextDocument,
  regions: EmbeddedRegion[],
  position: Position
): EmbeddedRegion | undefined {
  let offset = document.offsetAt(position);
  for (let region of regions) {
    if (region.tagName) {
      // console.log("TCL: region.tagName", region.tagName);
    }
    if (region.start <= offset) {
      if (offset <= region.end) {
        return region;
      }
    } else {
      break;
    }
  }

  console.error("embeddedSupport -> getRegionAtPosition -> No Region found");
  return undefined;
}

function getEmbeddedDocument(
  document: TextDocument,
  contents: EmbeddedRegion[],
  languageId: string,
  ignoreAttributeValues: boolean
): TextDocument {
  let currentPos = 0;
  let oldContent = document.getText();
  let result = "";
  let lastSuffix = "";
  for (let c of contents) {
    if (
      c.languageId === languageId &&
      (!ignoreAttributeValues || !c.attributeValue)
    ) {
      result = substituteWithWhitespace(
        result,
        currentPos,
        c.start,
        oldContent,
        lastSuffix,
        getPrefix(c)
      );
      result += oldContent.substring(c.start, c.end);
      currentPos = c.end;
      lastSuffix = getSuffix(c);
    }
  }
  result = substituteWithWhitespace(
    result,
    currentPos,
    oldContent.length,
    oldContent,
    lastSuffix,
    ""
  );
  return TextDocument.create(
    document.uri,
    languageId,
    document.version,
    result
  );
}

function getPrefix(c: EmbeddedRegion) {
  if (c.attributeValue) {
    switch (c.languageId) {
      case "css":
        return CSS_STYLE_RULE + "{";
    }
  }
  return "";
}
function getSuffix(c: EmbeddedRegion) {
  if (c.attributeValue) {
    switch (c.languageId) {
      case "css":
        return "}";
      case "javascript":
        return ";";
    }
  }
  return "";
}

function substituteWithWhitespace(
  result: string,
  start: number,
  end: number,
  oldContent: string,
  before: string,
  after: string
) {
  let accumulatedWS = 0;
  result += before;
  for (let i = start + before.length; i < end; i++) {
    let ch = oldContent[i];
    if (ch === "\n" || ch === "\r") {
      // only write new lines, skip the whitespace
      accumulatedWS = 0;
      result += ch;
    } else {
      accumulatedWS++;
    }
  }
  result = append(result, " ", accumulatedWS - after.length);
  result += after;
  return result;
}

function append(result: string, str: string, n: number): string {
  while (n > 0) {
    if (n & 1) {
      result += str;
    }
    n >>= 1;
    str += str;
  }
  return result;
}

function getAttributeLanguage(attributeName: string): string | null {
  let match = attributeName.match(/^(style)$|^(on\w+)$/i);
  if (!match) {
    return null;
  }
  return match[1] ? "css" : "javascript";
}

function createRegion(
  scanner: Scanner,
  document: TextDocument,
  languageId: string,
  tagName: string
) {
  let start = scanner.getTokenOffset();
  let end = scanner.getTokenEnd();
  let firstChar = document.getText()[start];
  if (firstChar === "'" || firstChar === '"') {
    start++;
    end--;
  }
  return {
    languageId: aureliaLanguageId,
    start,
    end,
    attributeValue: true,
    tagName,
  };
}
