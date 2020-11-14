import { ViewRegionType } from "./../embeddedLanguages/embeddedSupport";
import { TextDocumentPositionParams } from "vscode-languageserver";
import { HTMLDocumentRegions } from "../embeddedLanguages/embeddedSupport";
import { LanguageModelCache } from "../embeddedLanguages/languageModelCache";
import {
  LanguageMode,
  Position,
  TextDocument,
} from "../embeddedLanguages/languageModes";
import { getAureliaVirtualCompletions } from "../virtual/virtualCompletion/virtualCompletion";

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
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
