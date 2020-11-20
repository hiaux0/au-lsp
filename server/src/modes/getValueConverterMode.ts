import {
  getRegionAtPosition,
  parseDocumentRegions,
  ValueConverterRegionData,
  ViewRegionInfo,
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
import {
  enhanceValueConverterViewArguments,
  getAureliaVirtualCompletions,
  getVirtualViewModelCompletionSupplyContent,
} from "../virtual/virtualCompletion/virtualCompletion";
import { createValueConverterCompletion } from "../completions/completions";
import { aureliaProgram } from "../viewModel/AureliaProgram";
import { AureliaClassTypes, AureliaViewModel } from "../common/constants";

async function onValueConverterCompletion(
  _textDocumentPosition: TextDocumentPositionParams,
  document: TextDocument
) {
  const regions = await parseDocumentRegions(document);
  const targetRegion = getRegionAtPosition(
    document,
    regions,
    _textDocumentPosition.position
  );

  if (targetRegion?.type !== ViewRegionType.ValueConverter) return [];

  /** TODO: Infer type via isValueConverterRegion (see ts.isNodeDeclaration) */
  // Find value converter sourcefile
  const valueConverterRegion = targetRegion as ViewRegionInfo<
    ValueConverterRegionData
  >;

  const targetValueConverterComponent = aureliaProgram
    .getComponentList()
    .filter((component) => component.type === AureliaClassTypes.VALUE_CONVERTER)
    .find(
      (valueConverterComponent) =>
        valueConverterComponent.valueConverterName ===
        valueConverterRegion.data?.valueConverterName
    );

  if (!targetValueConverterComponent?.sourceFile) return [];

  const valueConverterCompletion = getVirtualViewModelCompletionSupplyContent(
    aureliaProgram,
    /**
     * Aurelia interface method name, that handles interaction with view
     */
    AureliaViewModel.TO_VIEW,
    targetValueConverterComponent?.sourceFile,
    "SortValueConverter",
    {
      customEnhanceMethodArguments: enhanceValueConverterViewArguments,
      omitMethodNameAndBrackets: true,
    }
  ).filter(
    /** ASSUMPTION: Only interested in `toView` */
    (completion) => completion.label === AureliaViewModel.TO_VIEW
  );

  return valueConverterCompletion;
}

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