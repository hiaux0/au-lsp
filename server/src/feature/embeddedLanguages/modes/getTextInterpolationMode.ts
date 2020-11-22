import { ViewRegionInfo, ViewRegionType } from "../embeddedSupport";
import { TextDocumentPositionParams } from "vscode-languageserver";
import { HTMLDocumentRegions } from "../embeddedSupport";
import { LanguageModelCache } from "../languageModelCache";
import { LanguageMode, Position, TextDocument } from "../languageModes";
import { getAureliaVirtualCompletions } from "../../../virtual/virtualCompletion/virtualCompletion";
import { DefinitionResult } from "../../definition/getDefinition";
import { getVirtualDefinition } from "../../../virtual/virtualDefinition/virtualDefinition";
import { aureliaProgram } from "../../../viewModel/AureliaProgram";
import { getAccessScopeDefinition } from "../../definition/accessScopeDefinition";

export function getTextInterpolationMode(
  documentRegions: LanguageModelCache<Promise<HTMLDocumentRegions>>
): LanguageMode {
  return {
    getId() {
      return ViewRegionType.TextInterpolation;
    },
    async doComplete(
      document: TextDocument,
      _textDocumentPosition: TextDocumentPositionParams
    ) {
      const aureliaVirtualCompletions = await getAureliaVirtualCompletions(
        _textDocumentPosition,
        document
      );
      if (aureliaVirtualCompletions.length > 0) {
        return aureliaVirtualCompletions;
      }

      return [];
    },
    async doDefinition(
      document: TextDocument,
      position: Position,
      goToSourceWord: string,
      attributeRegion: ViewRegionInfo
    ): Promise<DefinitionResult | undefined> {
      const regions = (await documentRegions.get(document)).getRegions();
      return getAccessScopeDefinition(
        document,
        position,
        goToSourceWord,
        regions
      );
    },
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
