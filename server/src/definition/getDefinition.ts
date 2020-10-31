import {
  RepeatForRegionData,
  ViewRegionInfo,
} from "./../embeddedLanguages/embeddedSupport";
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
  const repeatForRegions = regions.filter(
    (region) => region.type === ViewRegionType.RepeatFor
  ) as ViewRegionInfo<RepeatForRegionData>[];
  const targetRepeatForRegion = repeatForRegions.find(
    (repeatForRegion) => repeatForRegion.data?.iterator === goToSourceWord
  );

  if (targetRepeatForRegion) {
    /** repeat.for="" */

    if (
      !targetRepeatForRegion?.startLine ||
      !targetRepeatForRegion.start ||
      !targetRepeatForRegion.startCol
    ) {
      console.error(
        `RepeatFor-Region does not have a start (line). cSearched for ${goToSourceWord}`
      );
      return;
    }

    return {
      lineAndCharacter: {
        line: targetRepeatForRegion.startLine,
        character: targetRepeatForRegion.startCol,
      } /** TODO: Find class declaration position. Currently default to top of file */,
      viewModelFilePath: document.uri,
    };
  }

  throw new Error(`No file found for: >>${goToSourceWord}<<`);
}
