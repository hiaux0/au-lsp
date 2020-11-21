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
import { DefinitionResult } from "../feature/definition/getDefinition";
import { getVirtualDefinition } from "../virtual/virtualDefinition/virtualDefinition";
import { aureliaProgram } from "../viewModel/AureliaProgram";
import { getAccessScopeDefinition } from "../feature/definition/accessScopeDefinition";

export function getAttributeMode(
  documentRegions: LanguageModelCache<Promise<HTMLDocumentRegions>>
): LanguageMode {
  return {
    getId() {
      return ViewRegionType.Attribute;
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
      goToSourceWord: string
    ): Promise<DefinitionResult | undefined> {
      const regions = (await documentRegions.get(document)).getRegions();
      return getAccessScopeDefinition(
        document,
        position,
        goToSourceWord,
        regions
      );
    },
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
