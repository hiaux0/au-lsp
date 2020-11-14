import {
  getRegionAtPosition,
  RepeatForRegionData,
  ValueConverterRegionData,
  ViewRegionInfo,
} from "./../embeddedLanguages/embeddedSupport";
import { AureliaClassTypes, AureliaView } from "./../common/constants";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { AureliaProgram } from "./../viewModel/AureliaProgram";
import * as path from "path";
import * as ts from "typescript";
import { getDocumentRegionAtPosition } from "../embeddedLanguages/languageModes";
import { createSourceFile, getLineAndCharacterOfPosition } from "typescript";
import {
  getDocumentRegions,
  ViewRegionType,
} from "../embeddedLanguages/embeddedSupport";

export interface DefinitionResult {
  lineAndCharacter: ts.LineAndCharacter;
  viewModelFilePath?: string;
  viewFilePath?: string;
}

export async function getDefinition(
  document: TextDocument,
  position: Position,
  aureliaProgram: AureliaProgram,
  goToSourceWord: string
): Promise<DefinitionResult | undefined> {
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

  const regions = await getDocumentRegions(document);

  /** Check value converter region */
  const targetRegion = await getRegionAtPosition(document, regions, position);

  if (targetRegion?.type === ViewRegionType.ValueConverter) {
    const valueConverterRegion = targetRegion as ViewRegionInfo<
      ValueConverterRegionData
    >;
    const targetValueConverterComponent = aureliaProgram
      .getComponentList()
      .filter(
        (component) => component.type === AureliaClassTypes.VALUE_CONVERTER
      )
      .find(
        (valueConverterComponent) =>
          valueConverterComponent.valueConverterName ===
          valueConverterRegion.data?.valueConverterName
      );

    return {
      lineAndCharacter: {
        line: 1,
        character: 1,
      } /** TODO: Find toView() method */,
      viewModelFilePath: targetValueConverterComponent?.filePath,
    };
  }

  /** Check repeat.for region */
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
      !targetRepeatForRegion.startOffset ||
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
