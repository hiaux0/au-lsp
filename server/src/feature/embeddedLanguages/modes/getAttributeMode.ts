import { ViewRegionInfo, ViewRegionType } from "../embeddedSupport";
import { TextDocumentPositionParams } from "vscode-languageserver";
import { HTMLDocumentRegions } from "../embeddedSupport";
import { LanguageModelCache } from "../languageModelCache";
import { LanguageMode, Position, TextDocument } from "../languageModes";
import { getAureliaVirtualCompletions } from "../../../virtual/virtualCompletion/virtualCompletion";
import { DefinitionResult } from "../../definition/getDefinition";
import { getAccessScopeDefinition } from "../../definition/accessScopeDefinition";
import {
  createVirtualLanguageService,
  VirtualLanguageService,
} from "../../../virtual/virtualSourceFile";

export function getAttributeMode(
  documentRegions: LanguageModelCache<Promise<HTMLDocumentRegions>>
): LanguageMode {
  return {
    getId() {
      return ViewRegionType.Attribute;
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
      goToSourceWord: string
    ): Promise<DefinitionResult | undefined> {
      const regions = (await documentRegions.get(document)).getRegions();
      return getAccessScopeDefinition(
        document,
        position,
        goToSourceWord,
        regions
      );
    },
    async doHover(
      document: TextDocument,
      position: Position,
      goToSourceWord: string,
      attributeRegion: ViewRegionInfo
    ): Promise<ReturnType<VirtualLanguageService["getQuickInfoAtPosition"]>> {
      const virtualLanguageService = await createVirtualLanguageService(
        position,
        document,
        {
          region: attributeRegion,
        }
      );

      if (!virtualLanguageService) return;

      const quickInfo = virtualLanguageService.getQuickInfoAtPosition();

      if (!quickInfo) return;
      return quickInfo;
    },
    onDocumentRemoved(_document: TextDocument) {},
    dispose() {},
  };
}
