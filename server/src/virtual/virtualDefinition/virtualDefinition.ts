import * as path from "path";
import * as ts from "typescript";
import { DefinitionResult } from "../../feature/definition/getDefinition";
import { AureliaProgram } from "../../viewModel/AureliaProgram";
import {
  createVirtualSourceFile,
  VirtualSourceFileInfo,
  VIRTUAL_SOURCE_FILENAME,
} from "../virtualSourceFile";

export function getVirtualLangagueService(
  sourceFile: ts.SourceFile
): ts.LanguageService {
  let compilerSettings = {} as ts.CompilerOptions;
  compilerSettings = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ESNext,
    outDir: "dist",
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    lib: ["es2017.object", "es7", "dom"],
    sourceMap: true,
    rootDir: ".",
  };

  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => compilerSettings,
    getScriptFileNames: () => [sourceFile.fileName],
    getScriptVersion: () => "0",
    getScriptSnapshot: () => ts.ScriptSnapshot.fromString(sourceFile.getText()),
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };
  const cls = ts.createLanguageService(host, ts.createDocumentRegistry());

  if (!cls) {
    console.log("No cls");
    throw new Error("no cles");
  }

  return cls;
}

export function createVirtualFileWithContent(
  aureliaProgram: AureliaProgram,
  documentUri: string,
  content: string
): VirtualSourceFileInfo | undefined {
  // 1. Get original viewmodel file associated with view
  const aureliaFiles = aureliaProgram.getAureliaSourceFiles();
  const scriptExtensions = [".js", ".ts"]; // TODO find common place or take from package.json config
  const viewBaseName = path.parse(documentUri).name;

  const targetSourceFile = aureliaFiles?.find((aureliaFile) => {
    return scriptExtensions.find((extension) => {
      const toViewModelName = `${viewBaseName}${extension}`;
      const aureliaFileName = path.basename(aureliaFile.fileName);
      return aureliaFileName === toViewModelName;
    });
  });

  if (!targetSourceFile) {
    console.log(`No source file found for current view: ${documentUri}`);
    return;
  }

  const componentList = aureliaProgram.getComponentList();
  const customElementClassName = componentList.find(
    (component) =>
      component.baseFileName === path.parse(targetSourceFile.fileName).name
  )?.className;

  if (!customElementClassName) return;

  // 3. Create virtual completion
  const virtualViewModelSourceFile = ts.createSourceFile(
    VIRTUAL_SOURCE_FILENAME,
    targetSourceFile?.getText(),
    99
  );

  return {
    ...createVirtualSourceFile(
      virtualViewModelSourceFile,
      content,
      customElementClassName
    ),
    viewModelFilePath: targetSourceFile.fileName,
  };
}

export function getVirtualDefinition(
  filePath: string,
  aureliaProgram: AureliaProgram,
  goToSourceWord: string
): DefinitionResult | undefined {
  const { targetVirtualSourcefile, virtualCursorIndex, viewModelFilePath } =
    createVirtualFileWithContent(aureliaProgram, filePath, goToSourceWord) ||
    ({} as VirtualSourceFileInfo);

  const virtualCls = getVirtualLangagueService(targetVirtualSourcefile);

  const result = virtualCls.getDefinitionAtPosition(
    targetVirtualSourcefile.fileName,
    virtualCursorIndex
  );

  if (result?.length === 0) return;

  return {
    lineAndCharacter: targetVirtualSourcefile.getLineAndCharacterOfPosition(
      result![0].contextSpan?.start || 0
    ),
    viewModelFilePath,
  };

  // 1. Create virtual file
  // 2. with goToSourceWord
  // 3. return definition
}
