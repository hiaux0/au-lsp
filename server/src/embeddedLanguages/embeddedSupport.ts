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

export enum ViewRegionType {
  Attribute = "Attribute",
  AttributeInterpolation = "AttributeInterpolation",
  RepeatFor = "RepeatFor",
  TextInterpolation = "TextInterpolation",
  CustomElement = "CustomElement",
}

export interface ViewRegionInfo<RegionDataType = any> {
  type: ViewRegionType;
  languageId: string;
  startOffset?: number;
  startCol?: number;
  startLine?: number;
  endOffset?: number;
  endCol?: number;
  endLine?: number;
  attributeName?: string;
  tagName?: string;
  regionValue?: string;
  data?: RegionDataType;
}

export interface RepeatForRegionData {
  /** repeat.for="num of >numbers<" */
  iterableName: string;
  /** repeat.for=">num< of numbers" */
  iterator: string;
}

export type CustomElementRegionData = ViewRegionInfo[];

interface ViewRegions {
  interpolatedRegions: ViewRegionInfo[];
  customElementRegions: ViewRegionInfo[];
}

export const aureliaLanguageId = "aurelia";

export function getDocumentRegionsV2<RegionDataType>(
  document: TextDocument
): Promise<ViewRegionInfo<RegionDataType>[]> {
  return new Promise((resolve) => {
    const saxStream = new SaxStream({ sourceCodeLocationInfo: true });
    const viewRegions: ViewRegionInfo[] = [];
    const interpolationRegex = /\$(?:\s*)\{(?!\s*`)(?<interpolationValue>.*?)\}/g;

    const aureliaCustomElementNames = aureliaProgram.componentList.map(
      (component) => component.viewModelName
    );

    // 1. Check if in <template>
    let hasTemplateTag = false;

    /**
     * 1. Template Tag
     * 2. Attributes
     * 3. Attribute Interpolation
     * 4. Custom element
     * 5. repeat.for=""
     */
    saxStream.on("startTag", (startTag) => {
      const customElementAttributeRegions: ViewRegionInfo[] = [];
      const { tagName } = startTag;
      const isTemplateTag = tagName === AureliaView.TEMPLATE_TAG_NAME;
      // 1. Template tag
      if (isTemplateTag) {
        hasTemplateTag = true;
      }

      if (!hasTemplateTag) return;

      // Attributes and Interpolation
      startTag.attrs.forEach((attr) => {
        const isAttributeKeyword = AURELIA_ATTRIBUTES_KEYWORDS.some(
          (keyword) => {
            return attr.name.includes(keyword);
          }
        );
        const isRepeatFor = attr.name === AureliaView.REPEAT_FOR;

        // 2. Attributes
        if (isAttributeKeyword) {
          const attrLocation = startTag.sourceCodeLocation?.attrs[attr.name];

          if (!attrLocation) return;
          /** Eg. >click.delegate="<increaseCounter()" */
          const startInterpolationLength =
            attr.name.length + // click.delegate
            2; // ="

          /** Eg. click.delegate="increaseCounter()>"< */
          const endInterpolationLength = attrLocation.endOffset - 1;

          const updatedLocation: parse5.Location = {
            ...attrLocation,
            startOffset: attrLocation.startOffset + startInterpolationLength,
            endOffset: endInterpolationLength,
          };
          const viewRegion = createRegionV2({
            attributeName: attr.name,
            sourceCodeLocation: updatedLocation,
            type: ViewRegionType.Attribute,
          });
          viewRegions.push(viewRegion);
          customElementAttributeRegions.push(viewRegion);
        } else if (isRepeatFor) {
          // 5. Repeat for
          const attrLocation = startTag.sourceCodeLocation?.attrs[attr.name];

          if (!attrLocation) return;
          /** Eg. >repeat.for="<rule of grammarRules" */
          const startInterpolationLength =
            attr.name.length + // click.delegate
            2; // ="

          /** Eg. click.delegate="increaseCounter()>"< */
          const endInterpolationLength = attrLocation.endOffset - 1;

          // __<label repeat.for="rule of grammarRules">
          const startColAdjust =
            attrLocation.startCol + // __<label_
            attr.name.length + // repeat.for
            2 - // ="
            1; // index starts from 0

          const updatedLocation: parse5.Location = {
            ...attrLocation,
            startOffset: attrLocation.startOffset + startInterpolationLength,
            startCol: startColAdjust,
            endOffset: endInterpolationLength,
          };
          function getRepeatForData() {
            const splitUpRepeatFor = attr.value.split(" ");
            const repeatForData: RepeatForRegionData = {
              iterator: splitUpRepeatFor[0],
              iterableName: splitUpRepeatFor[2],
            };
            return repeatForData;
          }
          const repeatForViewRegion = createRegionV2<RepeatForRegionData>({
            attributeName: attr.name,
            sourceCodeLocation: updatedLocation,
            type: ViewRegionType.RepeatFor,
            data: getRepeatForData(),
          });
          viewRegions.push(repeatForViewRegion);
        } else {
          // 3. Attribute Interpolation
          let interpolationMatch;
          while ((interpolationMatch = interpolationRegex.exec(attr.value))) {
            if (interpolationMatch !== null) {
              const attrLocation =
                startTag.sourceCodeLocation?.attrs[attr.name];
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
                Number(interpolationMatch.groups?.interpolationValue.length); // message

              const updatedLocation: parse5.Location = {
                ...attrLocation,
                startOffset:
                  attrLocation.startOffset + startInterpolationLength,
                endOffset: endInterpolationLength,
              };

              const viewRegion = createRegionV2({
                attributeName: attr.name,
                sourceCodeLocation: updatedLocation,
                type: ViewRegionType.AttributeInterpolation,
                regionValue: interpolationMatch[1],
              });
              viewRegions.push(viewRegion);
            }
          }
        }
      });

      // 4. Custom elements
      const isCustomElement = aureliaCustomElementNames.includes(tagName);
      if (isCustomElement) {
        const customElementViewRegion = createRegionV2({
          tagName,
          sourceCodeLocation: startTag.sourceCodeLocation,
          type: ViewRegionType.CustomElement,
          data: customElementAttributeRegions,
        });
        viewRegions.push(customElementViewRegion);
      }
    });

    saxStream.on("text", (text) => {
      let interpolationMatch;
      while ((interpolationMatch = interpolationRegex.exec(text.text))) {
        if (interpolationMatch !== null) {
          text;
          const attrLocation = text.sourceCodeLocation;
          if (!attrLocation) return;

          /** Eg. \n\n  ${grammarRules.length} */
          const startInterpolationLength =
            attrLocation.startOffset +
            interpolationMatch.index + // width:_
            2; // ${

          /** Eg. >css="width: ${message}<px;" */
          const endInterpolationLength =
            startInterpolationLength +
            Number(interpolationMatch.groups?.interpolationValue.length); // message

          const updatedLocation: parse5.Location = {
            ...attrLocation,
            startOffset: startInterpolationLength,
            endOffset: endInterpolationLength,
          };

          const viewRegion = createRegionV2({
            sourceCodeLocation: updatedLocation,
            type: ViewRegionType.TextInterpolation,
          });
          viewRegions.push(viewRegion);
        }
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

function createRegionV2<RegionDataType = any>({
  sourceCodeLocation,
  type,
  attributeName,
  tagName,
  data,
  regionValue,
  languageId = aureliaLanguageId,
}: {
  sourceCodeLocation:
    | SaxStream.StartTagToken["sourceCodeLocation"]
    | parse5.AttributesLocation[string];
  type: ViewRegionType;
  regionValue?: string;
  attributeName?: string;
  tagName?: string;
  data?: RegionDataType;
  languageId?: string;
}): ViewRegionInfo {
  let calculatedStart = sourceCodeLocation?.startOffset;
  let calculatedEnd = sourceCodeLocation?.endOffset;

  return {
    type,
    languageId,
    startOffset: calculatedStart,
    startCol: sourceCodeLocation?.startCol,
    startLine: sourceCodeLocation?.startLine,
    endOffset: calculatedEnd,
    endCol: sourceCodeLocation?.endCol,
    endLine: sourceCodeLocation?.endLine,
    attributeName,
    tagName,
    regionValue,
    data,
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

export function getRegionFromLineAndCharacter(
  regions: ViewRegionInfo[],
  position: Position
) {
  const { line, character } = position;

  const targetRegion = regions.find((region) => {
    const { startLine, endLine } = region;
    if (!startLine || !endLine) return false;

    const isSameLine = startLine === endLine;
    if (isSameLine) {
      const { startCol, endCol } = region;
      if (!startCol || !endCol) return false;

      const inBetweenColumns = startCol <= character && character <= endCol;
      return inBetweenColumns;
    }

    const inBetweenLines = startLine <= line && line <= endLine;
    return inBetweenLines;
  });
  return targetRegion;
}

export function getRegionAtPositionV2(
  document: TextDocument,
  regions: ViewRegionInfo[],
  position: Position
): ViewRegionInfo | undefined {
  let offset = document.offsetAt(position);
  for (let region of regions) {
    if (region.startOffset! <= offset) {
      if (offset <= region.endOffset!) {
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
