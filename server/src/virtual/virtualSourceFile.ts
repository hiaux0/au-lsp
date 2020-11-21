import * as ts from "typescript";
import * as path from "path";
import { AureliaProgram } from "../viewModel/AureliaProgram";

export interface VirtualSourceFileInfo {
  virtualSourcefile: ts.SourceFile;
  virtualCursorIndex: number;
  viewModelFilePath?: string;
}

export const VIRTUAL_SOURCE_FILENAME = "virtual.ts";
const VIRTUAL_METHOD_NAME = "__vir";

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
    throw new Error("No cls");
  }

  return cls;
}

/**
 * With a virtual file, get access to file scope juicyness via a virtual progrm.
 *
 * 1. In the virtual view model source file
 * 2. Split up
 *   2.1 Need to visit each node
 *   2.2 (or are we regexing it?)
 *
 * @param originalSourceFile
 * @param virtualContent
 * @param targetClassName Name of the class associated to your view
 */
export function createVirtualViewModelSourceFile(
  originalSourceFile: ts.SourceFile,
  virtualContent: string,
  targetClassName: string
): VirtualSourceFileInfo {
  /** Match [...] export class MyCustomElement { [...] */
  const virtualViewModelContent = originalSourceFile.getText();
  const classDeclaration = "class ";
  const classNameToOpeningBracketRegex = new RegExp(
    `${classDeclaration}${targetClassName}(.*?{)`
  );
  const classNameAndOpeningBracketMatch = classNameToOpeningBracketRegex.exec(
    virtualViewModelContent
  );
  if (!classNameAndOpeningBracketMatch) {
    throw new Error(
      `No match found in File: ${originalSourceFile.fileName} with target class name: ${targetClassName}`
    );
  }

  /** class Foo >{<-- index */
  const classNameStartIndex = classNameAndOpeningBracketMatch?.index;
  const toOpeningBracketLength = classNameAndOpeningBracketMatch[1]?.length;
  const classOpeningBracketIndex =
    classDeclaration.length +
    targetClassName.length +
    classNameStartIndex +
    toOpeningBracketLength;

  /** Split on class MyClass >{< ..otherContent */
  const starter = virtualViewModelContent.slice(0, classOpeningBracketIndex);
  const ender = virtualViewModelContent.slice(classOpeningBracketIndex);

  /**  Create temp content */
  const tempMethodTextStart = `${VIRTUAL_METHOD_NAME}() {this.`;
  const tempMethodTextEnd = "};\n  ";
  const tempMethodText =
    tempMethodTextStart + virtualContent + tempMethodTextEnd;
  const tempWithContent = starter + tempMethodText + ender;

  const virtualSourcefile = ts.createSourceFile(
    VIRTUAL_SOURCE_FILENAME,
    tempWithContent,
    99
  );

  const virtualCursorIndex =
    classOpeningBracketIndex +
    tempMethodTextStart.length +
    virtualContent.length;

  return {
    virtualSourcefile,
    virtualCursorIndex,
  };
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

  // 2. Create virtual source file
  const virtualViewModelSourceFile = ts.createSourceFile(
    VIRTUAL_SOURCE_FILENAME,
    targetSourceFile?.getText(),
    99
  );

  return {
    ...createVirtualViewModelSourceFile(
      virtualViewModelSourceFile,
      content,
      customElementClassName
    ),
    viewModelFilePath: targetSourceFile.fileName,
  };
}
