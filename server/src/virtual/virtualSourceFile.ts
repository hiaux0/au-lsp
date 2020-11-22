import * as ts from "typescript";
import * as path from "path";
import { ViewRegionInfo } from "../feature/embeddedLanguages/embeddedSupport";
import { aureliaProgram, AureliaProgram } from "../viewModel/AureliaProgram";
import { Position, TextDocument } from "vscode-html-languageservice";
import {
  Hover,
  MarkupKind,
  TextDocumentPositionParams,
} from "vscode-languageserver";
import { getDocumentRegionAtPosition } from "../feature/embeddedLanguages/languageModes";

export const VIRTUAL_SOURCE_FILENAME = "virtual.ts";
const VIRTUAL_METHOD_NAME = "__vir";

export interface VirtualSourceFileInfo {
  virtualSourcefile: ts.SourceFile;
  virtualCursorIndex: number;
  viewModelFilePath?: string;
}

interface VirtualLanguageServiceOptions {
  /**
   * If triggered in my-compo.html, then go to my-compo.ts
   */
  relatedViewModel?: boolean;
  /**
   * Will overwrite `relatedViewModel`, for custom source file
   */
  sourceFile?: ts.SourceFile;
  /**
   * Extract data from given region.
   */
  region?: ViewRegionInfo;
  /**
   * Content to be passed into virtual file.
   */
  virtualContent?: string;
  /**
   * Offset for language service
   * TODO: RENAME: virtualCursorOffset
   */
  virtualCursorIndex?: number;
}

const DEFAULT_VIRTUAL_LANGUAGE_SERVICE_OPTIONS: VirtualLanguageServiceOptions = {};

/**
 * Leaned on ts.LanguageService.
 */
export interface VirtualLanguageService {
  getCompletionsAtPosition: () => any;
  getCompletionEntryDetails: () => any;
  getDefinitionAtPosition: () => any;
  getQuickInfoAtPosition: () => CustomHover | undefined;
}

export async function createVirtualLanguageService(
  position: Position,
  document: TextDocument,
  options: VirtualLanguageServiceOptions = DEFAULT_VIRTUAL_LANGUAGE_SERVICE_OPTIONS
): Promise<VirtualLanguageService | undefined> {
  console.log("TCL: position", position);
  console.log("TCL: document", document);
  console.log("TCL: options", options);

  const documentUri = document.uri;

  // 1. Get content for virtual file
  let virtualContent: string = "";
  if (options.region) {
    const region = await getDocumentRegionAtPosition(position).get(document);

    if (!region) return;

    virtualContent = document
      .getText()
      .slice(region.startOffset, region.endOffset);
  } else if (options.virtualContent) {
    virtualContent = options.virtualContent;
  }

  if (!virtualContent) {
    throw new Error("No virtual content");
  }

  // 2. Create virtual file
  const {
    virtualSourcefile,
    virtualCursorIndex,
  } = createVirtualFileWithContent(
    aureliaProgram,
    documentUri,
    virtualContent
  )!;

  const languageService = getVirtualLangagueService(virtualSourcefile);

  return {
    getCompletionsAtPosition: () => getCompletionsAtPosition(languageService),
    getCompletionEntryDetails: () => getCompletionEntryDetails(languageService),
    getDefinitionAtPosition: () =>
      getDefinitionAtPosition(
        languageService,
        virtualSourcefile,
        virtualCursorIndex
      ),
    getQuickInfoAtPosition: () =>
      getQuickInfoAtPosition(
        languageService,
        virtualSourcefile,
        virtualCursorIndex
      ),
  };
}

function getCompletionsAtPosition(languageService: ts.LanguageService) {
  // cls.getCompletionsAtPosition(fileName, 132, undefined); /*?*/
}

function getCompletionEntryDetails(languageService: ts.LanguageService) {
  // cls.getCompletionEntryDetails( fileName, 190, "toView", undefined, undefined, undefined); /*?*/
}

function getDefinitionAtPosition(
  languageService: ts.LanguageService,
  virtualSourcefile: ts.SourceFile,
  virtualCursorIndex: number
) {
  const defintion = languageService.getDefinitionAtPosition(
    virtualSourcefile.fileName,
    virtualCursorIndex
  );
  return defintion;
}

interface CustomHover extends Hover {
  documentation: string;
}

function getQuickInfoAtPosition(
  languageService: ts.LanguageService,
  virtualSourcefile: ts.SourceFile,
  virtualCursorIndex: number
): CustomHover | undefined {
  /**
   * 1.
   * Workaround: The normal ls.getQuickInfoAtPosition returns for objects and arrays just
   * `{}`, that's why we go through `getDefinitionAtPosition`.
   */
  const defintion = languageService.getDefinitionAtPosition(
    virtualSourcefile.fileName,
    virtualCursorIndex
  );
  if (!defintion) return;

  if (defintion.length > 1) {
    // TODO: Add VSCode warning, to know how to actually handle this case.
    // Currently, I think, only one defintion will be returned.
    throw new Error("Unsupported: Multiple defintions.");
  }

  /**
   * Workaround: Here, we have to substring the desired info from the original **source code**
   * --> hence the naming of this variable.
   *
   * BUG: Method: In using `contextSpan` for methods, the whole method body will be
   * taken into the 'context'
   */
  const span = defintion[0].contextSpan;

  if (!span) return;

  const sourceCodeText = virtualSourcefile
    .getText()
    .slice(span?.start, span?.start + span?.length);

  /**
   * 2. Documentation
   */
  const quickInfo = languageService.getQuickInfoAtPosition(
    virtualSourcefile.fileName,
    virtualCursorIndex
  );
  let documentation = "";

  if (quickInfo?.documentation) {
    documentation = quickInfo.documentation[0].text;
  }

  /**
   * 3. Result
   * Format taken from VSCode hovering
   */
  const result =
    "```ts\n" +
    `(${defintion[0].kind}) ${defintion[0].containerName}.${sourceCodeText}` +
    "\n```";

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: result,
    },
    documentation,
  };
}

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
