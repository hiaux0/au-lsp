import { AureliaView } from "./../common/constants";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { AureliaProgram } from "./../viewModel/AureliaProgram";
import * as path from "path";
import { getDocumentRegionAtPosition } from "../embeddedLanguages/languageModes";
import { VirtualDefinitionResult } from "../virtual/virtualDefinition";
import { createSourceFile, getLineAndCharacterOfPosition } from "typescript";
import {
  getDocumentRegions,
  getDocumentRegionsV2,
  ViewRegionType,
} from "../embeddedLanguages/embeddedSupport";

export async function getDefinition(
  document: TextDocument,
  position: Position,
  aureliaProgram: AureliaProgram,
  goToSourceWord: string
): Promise<VirtualDefinitionResult | undefined> {
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

  const regions = await getDocumentRegionsV2(document);
  const repeatForRegion = regions.find(
    (region) => region.type === ViewRegionType.RepeatFor
  );

  if (repeatForRegion) {
    /** repeat.for="" */

    if (
      !repeatForRegion?.startLine ||
      !repeatForRegion.start ||
      !repeatForRegion.startCol
    ) {
      console.error(
        `RepeatFor-Region does not have a start (line). cSearched for ${goToSourceWord}`
      );
      return;
    }

    return {
      lineAndCharacter: {
        line: repeatForRegion.startLine,
        character: repeatForRegion.startCol,
      } /** TODO: Find class declaration position. Currently default to top of file */,
      viewModelFilePath: document.uri,
    };
  } else {
    /** Triggered on <my-component |that-compo.bind="someVar"> */
    const componentMap = aureliaProgram.getComponentMap();
    const region = getDocumentRegionAtPosition(position).get(document);

    // TODO: below only placeholder to have TS not error out
    return {
      lineAndCharacter: {
        line: 1,
        character: 1,
      } /** TODO: Find class declaration position. Currently default to top of file */,
      viewModelFilePath: document.uri,
    };
  }

  throw new Error(`No file found for: >>${goToSourceWord}<<`);
}
