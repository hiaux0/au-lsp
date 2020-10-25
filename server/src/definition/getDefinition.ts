import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { AureliaProgram } from "./../viewModel/AureliaProgram";
import * as path from "path";
import { getDocumentRegionAtPosition } from "../embeddedLanguages/languageModes";

export function getDefinition(
  document: TextDocument,
  position: Position,
  aureliaProgram: AureliaProgram,
  goToSourceWord: string
) {
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
    /** Triggered on <my-component |that-compo.bind="someVar"> */
  } else {
    const componentMap = aureliaProgram.getComponentMap();
    const region = getDocumentRegionAtPosition(position).get(document);

    // TODO: below only placeholder to have TS not error out
    return {
      lineAndCharacter: {
        line: 1,
        character: 1,
      } /** TODO: Find class declaration position. Currently default to top of file */,
      viewModelFilePath: targetAureliaFile?.fileName,
    };
  }
}
