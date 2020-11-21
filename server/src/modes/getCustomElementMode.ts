import { ViewRegionInfo } from "./../embeddedLanguages/embeddedSupport";
import * as path from "path";
import {
  CustomElementRegionData,
  parseDocumentRegions,
  ViewRegionType,
} from "../embeddedLanguages/embeddedSupport";
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
import { DefinitionResult } from "../feature/definition/getDefinition";
import { connection } from "../server";
import { camelCase } from "@aurelia/kernel";
import { getVirtualDefinition } from "../virtual/virtualDefinition/virtualDefinition";

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
    async doDefinition(
      document: TextDocument,
      position: Position,
      goToSourceWord: string,
      customElementRegion: ViewRegionInfo
    ): Promise<DefinitionResult | undefined> {
      const aureliaSourceFiles = aureliaProgram.getAureliaSourceFiles();
      const targetAureliaFile = aureliaSourceFiles?.find((sourceFile) => {
        return path.parse(sourceFile.fileName).name === goToSourceWord;
      });

      /**
       * 1. Triggered on <|my-component>
       * */
      if (targetAureliaFile?.fileName) {
        return {
          lineAndCharacter: {
            line: 1,
            character: 1,
          } /** TODO: Find class declaration position. Currently default to top of file */,
          viewModelFilePath: targetAureliaFile?.fileName,
        };
      }

      /**
       * 2. >inter-bindable<.bind="increaseCounter()"
       */
      /** Source file different from view */
      const targetAureliaFileDifferentViewModel = aureliaSourceFiles?.find(
        (sourceFile) => {
          return (
            path.parse(sourceFile.fileName).name === customElementRegion.tagName
          );
        }
      );

      if (!targetAureliaFileDifferentViewModel) return;

      const sourceWordCamelCase = camelCase(goToSourceWord);

      return getVirtualDefinition(
        targetAureliaFileDifferentViewModel.fileName,
        aureliaProgram,
        sourceWordCamelCase
      );

      return;
    },
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
