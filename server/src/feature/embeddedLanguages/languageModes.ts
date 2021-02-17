/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getCSSLanguageService } from "vscode-css-languageservice";
import {
  CompletionList,
  Diagnostic,
  getLanguageService as getHTMLLanguageService,
  Position,
  Range,
  TextDocument,
} from "vscode-html-languageservice";
import { TextDocumentPositionParams } from "vscode-languageserver";
import { DefinitionResult } from "../definition/getDefinition";
import { getAttributeInterpolationMode } from "./modes/getAttributeInterpolationMode";
import { getAttributeMode } from "./modes/getAttributeMode";
import { getAureliaHtmlMode } from "./modes/getAureliaHtmlMode";
import { getCustomElementMode } from "./modes/getCustomElementMode";
import { getRepeatForMode } from "./modes/getRepeatForMode";
import { getTextInterpolationMode } from "./modes/getTextInterpolationMode";
import { getValueConverterMode } from "./modes/getValueConverterMode";
import { AureliaCompletionItem } from "../../virtual/virtualCompletion/virtualCompletion";
import {
  HTMLDocumentRegions,
  parseDocumentRegions,
  ViewRegionInfo,
  getRegionAtPosition,
  getDocumentRegions,
  ViewRegionType,
} from "./embeddedSupport";
import {
  getLanguageModelCache,
  LanguageModelCache,
} from "./languageModelCache";

export * from "vscode-html-languageservice";

export interface LanguageMode {
  getId(): string;
  doValidation?: (document: TextDocument) => Diagnostic[];
  doComplete?: (
    document: TextDocument,
    _textDocumentPosition: TextDocumentPositionParams,
    triggerCharacter?: string
  ) => Promise<CompletionList | AureliaCompletionItem[]>;
  doDefinition?: (
    document: TextDocument,
    position: Position,
    goToSourceWord: string,
    region: ViewRegionInfo
  ) => Promise<DefinitionResult | undefined>;
  doHover?: (
    document: TextDocument,
    position: Position,
    goToSourceWord: string,
    region: ViewRegionInfo
  ) => void;
  // ) => Promise<DefinitionResult | undefined>;
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

export interface LanguageModes {
  getModeAtPosition(
    document: TextDocument,
    position: Position
  ): Promise<LanguageMode | undefined>;
  getModeAndRegionAtPosition(
    document: TextDocument,
    position: Position
  ): Promise<LanguageModeWithRegion | undefined>;
  // getModesInRange(document: TextDocument, range: Range): LanguageModeRange[];
  getAllModes(): LanguageMode[];
  // getAllModesInDocument(document: TextDocument): LanguageMode[];
  getMode(languageId: string): LanguageMode | undefined;
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

export interface LanguageModeRange extends Range {
  mode: LanguageMode | undefined;
  attributeValue?: boolean;
}

export function getDocumentRegionAtPosition(position: Position) {
  const htmlLanguageService = getHTMLLanguageService();
  const cssLanguageService = getCSSLanguageService();

  const documentRegion = getLanguageModelCache<ViewRegionInfo | undefined>(
    10,
    60,
    async (document) => {
      let regions: ViewRegionInfo[] = [];
      try {
        regions = await parseDocumentRegions(document);
      } catch (err) {
        console.log("72 TCL: getDocumentRegionAtPosition -> err", err);
      }

      const reg = getRegionAtPosition(document, regions, position);

      return reg;
    }
  );

  return documentRegion;
}

export interface LanguageModeWithRegion {
  mode: LanguageMode;
  region: ViewRegionInfo;
}
export async function getLanguageModes(): Promise<LanguageModes> {
  const htmlLanguageService = getHTMLLanguageService();
  const cssLanguageService = getCSSLanguageService();

  let documentRegions = await getLanguageModelCache<HTMLDocumentRegions>(
    10,
    60,
    (document) => getDocumentRegions(document)
  );

  let modelCaches: LanguageModelCache<any>[] = [];
  modelCaches.push(documentRegions);

  let modes = Object.create(null);

  modes["html"] = {};
  modes["html"].mode = await getAureliaHtmlMode(documentRegions);

  modes[ViewRegionType.Attribute] = {};
  modes[ViewRegionType.Attribute].mode = await getAttributeMode(
    documentRegions
  );

  modes[ViewRegionType.AttributeInterpolation] = {};
  modes[
    ViewRegionType.AttributeInterpolation
  ].mode = await getAttributeInterpolationMode(documentRegions);

  modes[ViewRegionType.CustomElement] = {};
  modes[ViewRegionType.CustomElement].mode = await getCustomElementMode(
    documentRegions
  );

  modes[ViewRegionType.RepeatFor] = {};
  modes[ViewRegionType.RepeatFor].mode = await getRepeatForMode(
    documentRegions
  );

  modes[ViewRegionType.TextInterpolation] = {};
  modes[ViewRegionType.TextInterpolation].mode = await getTextInterpolationMode(
    documentRegions
  );

  modes[ViewRegionType.ValueConverter] = {};
  modes[ViewRegionType.ValueConverter].mode = await getValueConverterMode(
    documentRegions
  );

  return {
    async getModeAndRegionAtPosition(
      document: TextDocument,
      position: Position
    ): Promise<LanguageModeWithRegion | undefined> {
      const documentRegion = await documentRegions.get(document);
      let regionAtPosition = documentRegion.getRegionAtPosition(position);
      let languageId = regionAtPosition?.languageId ?? "html";

      if (languageId) {
        modes[languageId].region = regionAtPosition;
        return modes[languageId];
      }
      return undefined;
    },
    async getModeAtPosition(
      document: TextDocument,
      position: Position
    ): Promise<LanguageMode | undefined> {
      const documentRegion = await documentRegions.get(document);
      let languageId = documentRegion.getLanguageAtPosition(position);

      if (languageId) {
        return modes[languageId];
      }
      return undefined;
    },
    // getModesInRange(document: TextDocument, range: Range): LanguageModeRange[] {
    //   return documentRegions
    //     .get(document)
    //     .getLanguageRanges(range)
    //     .map((r) => {
    //       return <LanguageModeRange>{
    //         start: r.start,
    //         end: r.end,
    //         mode: r.languageId && modes[r.languageId],
    //         attributeValue: r.attributeValue,
    //       };
    //     });
    // },
    // getAllModesInDocument(document: TextDocument): LanguageMode[] {
    //   let result = [];
    //   for (let languageId of documentRegions
    //     .get(document)
    //     .getLanguagesInDocument()) {
    //     let mode = modes[languageId];
    //     if (mode) {
    //       result.push(mode);
    //     }
    //   }
    //   return result;
    // },
    getAllModes(): LanguageMode[] {
      let result = [];
      for (let languageId in modes) {
        let mode = modes[languageId];
        if (mode) {
          result.push(mode);
        }
      }
      return result;
    },
    getMode(languageId: string): LanguageMode {
      return modes[languageId];
    },
    onDocumentRemoved(document: TextDocument) {
      modelCaches.forEach((mc) => mc.onDocumentRemoved(document));
      for (let mode in modes) {
        modes[mode].onDocumentRemoved(document);
      }
    },
    dispose(): void {
      modelCaches.forEach((mc) => mc.dispose());
      modelCaches = [];
      for (let mode in modes) {
        modes[mode].dispose();
      }
      modes = {};
    },
  };
}
