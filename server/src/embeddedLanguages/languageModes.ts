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
import {
  getDocumentRegions,
  HTMLDocumentRegions,
  EmbeddedRegion,
  aureliaLanguageId,
  getDocumentRegionsV2,
  ViewRegionInfo,
  getRegionAtPosition,
  getRegionAtPositionV2,
  getRegionFromLineAndCharacter,
} from "./embeddedSupport";
import {
  getLanguageModelCache,
  LanguageModelCache,
} from "./languageModelCache";

export * from "vscode-html-languageservice";

export interface LanguageMode {
  getId(): string;
  doValidation?: (document: TextDocument) => Diagnostic[];
  doComplete?: (document: TextDocument, position: Position) => CompletionList;
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

export interface LanguageModes {
  // getModeAtPosition(
  //   document: TextDocument,
  //   position: Position
  // ): LanguageMode | undefined;
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
        regions = await getDocumentRegionsV2(document);
      } catch (err) {
        console.log("72 TCL: getDocumentRegionAtPosition -> err", err);
      }

      const reg = getRegionAtPositionV2(document, regions, position);
      // const reg = getRegionFromLineAndCharacter(regions, position);

      return reg;
      // const region = getDocumentRegions(
      // htmlLanguageService,
      // document
      // ).getRegionAtPosition(position);
      // return region;
    }
  );

  return documentRegion;
}

export async function getLanguageModes(): Promise<LanguageModes> {
  const htmlLanguageService = getHTMLLanguageService();
  const cssLanguageService = getCSSLanguageService();

  let documentRegions = await getLanguageModelCache<ViewRegionInfo[]>(
    10,
    60,
    (document) => getDocumentRegionsV2(document)
  );

  let modelCaches: LanguageModelCache<any>[] = [];
  modelCaches.push(documentRegions);

  let modes = Object.create(null);
  modes[aureliaLanguageId] = aureliaLanguageId;

  return {
    // async getModeAtPosition(
    //   document: TextDocument,
    //   position: Position
    // ): Promise<LanguageMode | undefined> {
    //   let languageId = documentRegions
    //     .get(document)
    //     .getLanguageAtPosition(position);
    //   if (languageId) {
    //     return modes[languageId];
    //   }
    //   return undefined;
    // },
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
