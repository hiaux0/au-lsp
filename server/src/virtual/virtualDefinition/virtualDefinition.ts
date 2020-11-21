import * as path from "path";
import * as ts from "typescript";
import { DefinitionResult } from "../../feature/definition/getDefinition";
import { AureliaProgram } from "../../viewModel/AureliaProgram";
import {
  createVirtualFileWithContent,
  createVirtualViewModelSourceFile,
  getVirtualLangagueService,
  VirtualSourceFileInfo,
  VIRTUAL_SOURCE_FILENAME,
} from "../virtualSourceFile";

/**
 * 1. Create virtual file
 * 2. with goToSourceWord
 * 3. return definition
 */
export function getVirtualDefinition(
  filePath: string,
  aureliaProgram: AureliaProgram,
  goToSourceWord: string
): DefinitionResult | undefined {
  const { virtualSourcefile, virtualCursorIndex, viewModelFilePath } =
    createVirtualFileWithContent(aureliaProgram, filePath, goToSourceWord) ||
    ({} as VirtualSourceFileInfo);

  const virtualCls = getVirtualLangagueService(virtualSourcefile);

  const result = virtualCls.getDefinitionAtPosition(
    virtualSourcefile.fileName,
    virtualCursorIndex
  );

  if (result?.length === 0) return;

  return {
    lineAndCharacter: virtualSourcefile.getLineAndCharacterOfPosition(
      result![0].contextSpan?.start || 0
    ),
    viewModelFilePath,
  };
}
