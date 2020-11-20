import * as path from "path";
import { ViewRegionType } from "../embeddedLanguages/embeddedSupport";
import { TextDocumentPositionParams } from "vscode-languageserver";
import { HTMLDocumentRegions } from "../embeddedLanguages/embeddedSupport";
import { LanguageModelCache } from "../embeddedLanguages/languageModelCache";
import {
  LanguageMode,
  Position,
  TextDocument,
} from "../embeddedLanguages/languageModes";
import { getAureliaVirtualCompletions } from "../virtual/virtualCompletion/virtualCompletion";
import { getBindablesCompletion } from "../completions/completions";
import { aureliaProgram } from "../viewModel/AureliaProgram";
import { DefinitionResult } from "../definition/getDefinition";

export function getCustomElementMode(
  documentRegions: LanguageModelCache<Promise<HTMLDocumentRegions>>
): LanguageMode {
  return {
    getId() {
      return ViewRegionType.CustomElement;
    },
    async doComplete(
      document: TextDocument,
      _textDocumentPosition: TextDocumentPositionParams,
      triggerCharacter: string | undefined
    ) {
      if (triggerCharacter === " ") {
        const bindablesCompletion = await getBindablesCompletion(
          _textDocumentPosition,
          document
        );
        if (bindablesCompletion.length > 0) return bindablesCompletion;
        console.log("TCL: triggerCharacter", triggerCharacter);
      }
      return [];
    },
    doDefinition(
      document: TextDocument,
      position: Position,
      goToSourceWord: string
    ): DefinitionResult | undefined {
      const aureliaSourceFiles = aureliaProgram.getAureliaSourceFiles();
      const targetAureliaFile = aureliaSourceFiles?.find((sourceFile) => {
        return path.parse(sourceFile.fileName).name === goToSourceWord;
      });

      /** Triggered on <|my-component> */
      if (targetAureliaFile?.fileName) {
        return {
          lineAndCharacter: {
            line: 1,
            character: 1,
          } /** TODO: Find class declaration position. Currently default to top of file */,
          viewModelFilePath: targetAureliaFile?.fileName,
        };
      }

      return;
    },
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
