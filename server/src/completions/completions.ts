import { kebabCase } from "@aurelia/kernel";
import {
  TextDocument,
  TextDocumentPositionParams,
} from "vscode-languageserver";
import {
  CustomElementRegionData,
  getDocumentRegionsV2,
  getRegionFromLineAndCharacter,
  ViewRegionType,
} from "../embeddedLanguages/embeddedSupport";
import { Position } from "../embeddedLanguages/languageModes";

import { aureliaProgram } from "../viewModel/AureliaProgram";

export async function getBindablesCompletion(
  _textDocumentPosition: TextDocumentPositionParams,
  document: TextDocument
) {
  const { position } = _textDocumentPosition;
  const adjustedPosition: Position = {
    character: position.character + 1,
    line: position.line + 1,
  };
  const regions = await getDocumentRegionsV2<CustomElementRegionData>(document);
  const customElementRegions = regions.filter(
    (region) => region.type === ViewRegionType.CustomElement
  );
  const targetCustomElementRegion = getRegionFromLineAndCharacter(
    customElementRegions,
    adjustedPosition
  );

  if (!targetCustomElementRegion) return [];

  return [...aureliaProgram.getComponentMap().bindables!].filter(
    (bindable) =>
      kebabCase(bindable.data.elementName) === targetCustomElementRegion.tagName
  );
}
