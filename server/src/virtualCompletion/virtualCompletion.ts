/**
 * File was copied and modified from
 * https://typescript-api-playground.glitch.me/#example=Creating%20a%20ts.Program%20and%20SourceFile%20in%20memory%20for%20testing%20without%20file%20system
 * From the SO question
 * https://stackoverflow.com/questions/50574469/can-i-change-the-sourcefile-of-a-node-using-the-typescript-compiler-api
 */

/**
 * 1. Get region
 * 2. Get aurelia view model file
 * 3. split content to instert temporary method (used for actual completion, thus "virtual")
 * 4. From 3. create virtualSourceFile
 * 5. Create language service from 4.
 * 6. Get completions
 */

import * as ts from "typescript";
import * as path from "path";
import { CompletionItem, InsertTextFormat, TextDocument } from 'vscode-css-languageservice';
import { MarkupKind, TextDocumentPositionParams } from 'vscode-languageserver';
import { EmbeddedRegion } from '../embeddedLanguages/embeddedSupport';
import { getDocumentRegionAtPosition } from '../embeddedLanguages/languageModes';
import { AureliaProgram } from '../viewModel/AureliaProgram';

const VIRTUAL_SOURCE_FILENAME = "virtual.ts";

/**
 * With a virtual file, create a completions from a virtual progrm.
 *
 * 1. In the virtual view model source file
 * 2. Split up
 *   2.1 Need to visit each node
 *   2.2 (or are we regexing it?)
 *
 * @param virtualViewModelSourceFile
 * @param virtualContent
 * @param customElementClassName Name of the class associated to your view
 */
export function createVirtualCompletionSourceFile(
  virtualViewModelSourceFile: ts.SourceFile,
  virtualContent: string,
  customElementClassName: string
) {
  /** Match [...] export class MyCustomElement { [...] */
  const virtualViewModelContent = virtualViewModelSourceFile.getText();
  const classDeclaration = "class ";
  const classNameToOpeningBracketRegex = new RegExp(
    `${classDeclaration}${customElementClassName}(.*?{)`
  );
  const classNameAndOpeningBracketMatch = classNameToOpeningBracketRegex.exec(
    virtualViewModelContent
  );
  if (!classNameAndOpeningBracketMatch) {
    throw new Error(
      `No match found in File: ${virtualViewModelSourceFile.fileName} with target class name: ${customElementClassName}`
    );
  }

  /** class Foo >{<-- index */
  const classNameStartIndex = classNameAndOpeningBracketMatch?.index;
  const toOpeningBracketLength = classNameAndOpeningBracketMatch[1]?.length;
  const classOpeningBracketIndex =
    classDeclaration.length +
    customElementClassName.length +
    classNameStartIndex +
    toOpeningBracketLength;

  /** Split on class MyClass >{< ..otherContent */
  const starter = virtualViewModelContent.slice(0, classOpeningBracketIndex);
  const ender = virtualViewModelContent.slice(classOpeningBracketIndex);

  /**  Create temp content */
  const tempMethodTextStart = `temp() {this.`;
  const tempMethodTextEnd = "};\n  ";
  const tempMethodText =
    tempMethodTextStart + virtualContent + tempMethodTextEnd;
  const tempWithCompletion = starter + tempMethodText + ender;

  const targetVirtualSourcefile = ts.createSourceFile(
    VIRTUAL_SOURCE_FILENAME,
    tempWithCompletion,
    99
  );

  const completionIndex =
    classOpeningBracketIndex +
    tempMethodTextStart.length +
    virtualContent.length;

  return {
    targetVirtualSourcefile,
    completionIndex,
  };
}

/**
 * Returns the virtual competion. (to be used as real completions)
 */
export function getVirtualCompletion(
  sourceFile: ts.SourceFile,
  positionOfAutocomplete: number
) {
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

  if (!cls) throw new Error('No cls')

  const virtualCompletions = cls.getCompletionsAtPosition(
    sourceFile.fileName,
    positionOfAutocomplete,
    undefined
  )?.entries;

  if (!virtualCompletions) {
    throw new Error('No completions found')
  }

  const virtualQuickInfo = cls.getQuickInfoAtPosition(sourceFile.fileName, positionOfAutocomplete);

  const virtualCompletionEntryDetails = virtualCompletions.map(completion=> {
    return cls.getCompletionEntryDetails(sourceFile.fileName, positionOfAutocomplete, completion.name, undefined, undefined, undefined) /*?*/
  });


  return { virtualCompletions, virtualQuickInfo, virtualCompletionEntryDetails };
  // return map(virtualCompletions, "name");
}

export function createProgram(
  files: {
    fileName: string;
    content: string;
    sourceFile?: ts.SourceFile;
  }[],
  compilerOptions?: ts.CompilerOptions
): ts.Program {
  const tsConfigJson = ts.parseConfigFileTextToJson(
    "tsconfig.json",
    compilerOptions
      ? JSON.stringify(compilerOptions)
      : `{
	  "compilerOptions": {
		"target": "es2018",
		"module": "commonjs",
		"lib": ["es2018"],
		"rootDir": ".",
		"strict": false,
		"esModuleInterop": true,
	  }
	`
  );
  let { options, errors } = ts.convertCompilerOptionsFromJson(
    tsConfigJson.config.compilerOptions,
    "."
  );
  if (errors.length) {
    throw errors;
  }
  const compilerHost = ts.createCompilerHost(options);
  compilerHost.getSourceFile = function (
    fileName: string,
    languageVersion: ts.ScriptTarget,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean
  ): ts.SourceFile | undefined {
    const file = files.find((f) => f.fileName === fileName);
    if (!file) return undefined;
    file.sourceFile =
      file.sourceFile ||
      ts.createSourceFile(fileName, file.content, ts.ScriptTarget.ES2015, true);
    return file.sourceFile;
  };
  return ts.createProgram(
    files.map((f) => f.fileName),
    options,
    compilerHost
  );
}

function visit(
  node: ts.Node,
  visitor: (node: ts.Node, level: number) => void,
  level: number = 0
) {
  if (!node) {
    return;
  }
  visitor(node, level);
  node.forEachChild((child) => visit(child, visitor, level + 1));
}

function getKindName(kind: ts.SyntaxKind) {
  return (ts as any).SyntaxKind[kind];
}

export function getVirtualViewModelCompletion(textDocumentPosition: TextDocumentPositionParams, document: TextDocument, aureliaProgram: AureliaProgram) {
  // 1. From the region get the part, that should be made virtual.
  const documentUri = textDocumentPosition.textDocument.uri;
  const region = getDocumentRegionAtPosition(textDocumentPosition.position).get(document);

  const virtualContent = document.getText().slice(region.start, region.end);

  // 2. Get original viewmodel file from view
  const aureliaFiles = aureliaProgram.getAureliaSourceFiles();
  const scriptExtensions = [".js", ".ts"]; // TODO find common place or take from package.json config
  const viewBaseName = path.parse(documentUri).name;
  const targetSourceFile = aureliaFiles?.find(aureliaFile => {
    return scriptExtensions.find(extension => {
      const toViewModelName = `${viewBaseName}${extension}`;
      const aureliaFileName = path.basename(aureliaFile.fileName);
      return aureliaFileName === toViewModelName;
    });
  });

  if (!targetSourceFile) {
    throw new Error(`No source file found for current view: ${documentUri}`);
  }

  // 3. Create virtual completion
  const virtualViewModelSourceFile = ts.createSourceFile('virtual.ts', targetSourceFile?.getText(), 99);
  const customElementClassName = 'MyCompoCustomElement';
  const {
    targetVirtualSourcefile,
    completionIndex
  } = createVirtualCompletionSourceFile(virtualViewModelSourceFile, virtualContent, customElementClassName);

  const {
    virtualCompletions,
    virtualQuickInfo,
    virtualCompletionEntryDetails,
  }= getVirtualCompletion(
    targetVirtualSourcefile,
    completionIndex
  );

  if (!virtualCompletions) {
    console.log(`
      We were trying to find completions for: ${virtualContent},
      but couldn't find anything in the view model: ${documentUri}
    `)
    return [];
  }

  if (!virtualCompletionEntryDetails) {
    return [];
  }

  const documentation = virtualCompletionEntryDetails.map(
    (entryDetail) => {
      return entryDetail?.displayParts?.map((part) => part.text).join('') ||
      "No documenation found."
    }
  )

  const result = virtualCompletions.map(tsCompletion => {
    // const kindMap = {

    // }
    const completionItem: CompletionItem = {
      documentation: {
        kind: MarkupKind.Markdown,
        value: documentation.join(''),
      },
      detail: tsCompletion.kind,
      insertTextFormat: InsertTextFormat.Snippet,
      label: tsCompletion.name,
    }
    /**
      documentation: {
        kind: MarkupKind.Markdown,
        value: documentation,
      },
      detail: `${elementName}`,
      insertText: `${elementName}$2>$1</${elementName}>$0`,
      insertTextFormat: InsertTextFormat.Snippet,
      kind: CompletionItemKind.Class,
      label: `${elementName} (Au Class Declaration)`,
     */
    return completionItem;
  })

  return result;
}