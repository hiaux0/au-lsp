import { kebabCase } from 'lodash';
import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupKind,
  TextDocument,
  TextDocumentPositionParams,
} from 'vscode-languageserver';
import { AureliaClassTypes } from '../../common/constants';
import {
  CustomElementRegionData,
  parseDocumentRegions,
  getRegionFromLineAndCharacter,
  ValueConverterRegionData,
  ViewRegionInfo,
  ViewRegionType,
} from '../embeddedLanguages/embeddedSupport';
import { Position } from '../embeddedLanguages/languageModes';

import { aureliaProgram } from '../../viewModel/AureliaProgram';

export async function getBindablesCompletion(
  _textDocumentPosition: TextDocumentPositionParams,
  document: TextDocument
) {
  const { position } = _textDocumentPosition;
  const adjustedPosition: Position = {
    character: position.character + 1,
    line: position.line + 1,
  };
  const regions = await parseDocumentRegions<CustomElementRegionData>(document);
  const customElementRegions = regions.filter(
    (region) => region.type === ViewRegionType.CustomElement
  );
  const targetCustomElementRegion = getRegionFromLineAndCharacter(
    customElementRegions,
    adjustedPosition
  );

  if (!targetCustomElementRegion) return [];

  return [...aureliaProgram.getComponentCompletionsMap().bindables!].filter(
    (bindable) =>
      kebabCase(bindable.data.elementName) === targetCustomElementRegion.tagName
  );
}

export function createValueConverterCompletion(
  targetRegion: ViewRegionInfo
): CompletionItem[] {
  const valueConverterRegion = targetRegion as ViewRegionInfo<
    ValueConverterRegionData
  >;

  const valueConverterCompletionList = aureliaProgram
    .getComponentList()
    .filter((component) => component.type === AureliaClassTypes.VALUE_CONVERTER)
    .map((valueConverterComponent) => {
      const elementName = valueConverterComponent.valueConverterName;
      const result: CompletionItem = {
        documentation: {
          kind: MarkupKind.Markdown,
          value: 'doc todod',
        },
        detail: `${elementName}`,
        insertText: `${elementName}`,
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Class,
        label: `(Au VC) ${valueConverterComponent.className}`,
        data: {
          type: AureliaClassTypes.VALUE_CONVERTER,
          valueConverterName: valueConverterComponent.valueConverterName,
        },
      };
      return result;
    });
  return valueConverterCompletionList;
}
