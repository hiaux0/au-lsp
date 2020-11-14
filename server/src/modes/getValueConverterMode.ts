import {
  getRegionAtPosition,
  parseDocumentRegions,
  ViewRegionType,
} from "./../embeddedLanguages/embeddedSupport";
import { TextDocumentPositionParams } from "vscode-languageserver";
import { HTMLDocumentRegions } from "../embeddedLanguages/embeddedSupport";
import { LanguageModelCache } from "../embeddedLanguages/languageModelCache";
import {
  LanguageMode,
  Position,
  TextDocument,
} from "../embeddedLanguages/languageModes";
import { getAureliaVirtualCompletions } from "../virtual/virtualCompletion/virtualCompletion";
import { onValueConverterCompletion } from "../server";
import { createValueConverterCompletion } from "../completions/completions";

export function getValueConverterMode(
  documentRegions: LanguageModelCache<Promise<HTMLDocumentRegions>>
): LanguageMode {
  return {
    getId() {
      return ViewRegionType.ValueConverter;
    },
    async doComplete(
      document: TextDocument,
      _textDocumentPosition: TextDocumentPositionParams,
      triggerCharacter: string | undefined
    ) {
      if (triggerCharacter === ":") {
        const completions = await onValueConverterCompletion(
          _textDocumentPosition,
          document
        );
        return completions;
      }

      const regions = await parseDocumentRegions(document);
      const targetRegion = await getRegionAtPosition(
        document,
        regions,
        _textDocumentPosition.position
      );

      if (!targetRegion) return [];

      const valueConverterCompletion = createValueConverterCompletion(
        targetRegion
      );
      return valueConverterCompletion;
    },
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
