import {
  ViewRegionInfo,
  ViewRegionType,
} from "../feature/embeddedLanguages/embeddedSupport";
import { TextDocumentPositionParams } from "vscode-languageserver";
import { HTMLDocumentRegions } from "../feature/embeddedLanguages/embeddedSupport";
import { LanguageModelCache } from "../feature/embeddedLanguages/languageModelCache";
import {
  LanguageMode,
  Position,
  TextDocument,
} from "../feature/embeddedLanguages/languageModes";
import { getAureliaVirtualCompletions } from "../virtual/virtualCompletion/virtualCompletion";
import {
  getAccessScopeDefinition,
  getAccessScopeViewModelDefinition,
} from "../feature/definition/accessScopeDefinition";
import { DefinitionResult } from "../feature/definition/getDefinition";

export function getRepeatForMode(
  documentRegions: LanguageModelCache<Promise<HTMLDocumentRegions>>
): LanguageMode {
  return {
    getId() {
      return ViewRegionType.RepeatFor;
    },
    async doComplete(
      document: TextDocument,
      _textDocumentPosition: TextDocumentPositionParams
    ) {
      const aureliaVirtualCompletions = await getAureliaVirtualCompletions(
        _textDocumentPosition,
        document
      );
      if (aureliaVirtualCompletions.length > 0) {
        return aureliaVirtualCompletions;
      }

      return [];
    },
    async doDefinition(
      document: TextDocument,
      position: Position,
      goToSourceWord: string,
      attributeRegion: ViewRegionInfo
    ): Promise<DefinitionResult | undefined> {
      const regions = (await documentRegions.get(document)).getRegions();
      return getAccessScopeViewModelDefinition(
        document,
        position,
        goToSourceWord
      );
    },
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
