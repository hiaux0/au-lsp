import { ViewRegionType } from "../embeddedSupport";
import { TextDocumentPositionParams } from "vscode-languageserver";
import { HTMLDocumentRegions } from "../embeddedSupport";
import { LanguageModelCache } from "../languageModelCache";
import { LanguageMode, Position, TextDocument } from "../languageModes";
import { getAureliaVirtualCompletions } from "../../../virtual/virtualCompletion/virtualCompletion";
import { aureliaProgram } from "../../../viewModel/AureliaProgram";

export function getAureliaHtmlMode(
  documentRegions: LanguageModelCache<Promise<HTMLDocumentRegions>>
): LanguageMode {
  return {
    getId() {
      return "html";
    },
    async doComplete(
      document: TextDocument,
      _textDocumentPosition: TextDocumentPositionParams,
      triggerCharacter: string | undefined
    ) {
      if (triggerCharacter === "<") {
        return [...aureliaProgram.getComponentMap().classDeclarations!];
      }
      return [];
    },
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
