/**
 * File was copied and modified from
 * https://typescript-api-playground.glitch.me/#example=Creating%20a%20ts.Program%20and%20SourceFile%20in%20memory%20for%20testing%20without%20file%20system
 * From the SO question
 * https://stackoverflow.com/questions/50574469/can-i-change-the-sourcefile-of-a-node-using-the-typescript-compiler-api
 */
/**
- [ ] 1. Create a program
  - [ ] 1.1 current viewModel of view (as sourcefile)
  - [ ] 1.2 in the program, find the target viewModel sourcefile
  - [ ] 1.3 createTempCompletion
    - [ ] 1.3.1 - add "phantom" method, that handles the autocompletion for us
    - [ ] 1.3.2 - find correct place in code to do the spliiting!
  - [ ] 1.4 createCompletion - use createLanguageService, that handles the actual completion getCompletionsAtPosition
 */

import * as ts from "typescript";

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
  // Match [...] export class MyCustomElement { [...]
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

  // Create virtual/temp program and sourcefile
  // const tempProgram = createProgram([
  //   { fileName: "temp.ts", content: tempWithCompletion },
  // ]);
  // const targetVirtualSourcefile = tempProgram.getSourceFiles()[0];
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

  // const result = targetVirtualSourcefile.getText().slice(0, completionIndex);
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
    // program.getSourceFiles().map((file) => file.fileName),
    // getScriptFileNames: () => program.getSourceFiles().map(file => file.fileName),
    getScriptVersion: () => "0",
    getScriptSnapshot: () => ts.ScriptSnapshot.fromString(sourceFile.getText()),
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };
  const cls = ts.createLanguageService(host, ts.createDocumentRegistry());
  cls
    .getProgram()
    ?.getSourceFiles()
    .map((sf) => sf.fileName);

  const quickInfo = cls?.getCompletionsAtPosition(
    sourceFile.fileName,
    positionOfAutocomplete,
    undefined
  )?.entries;
  // .filter(entry => !filterOutKind.find(filteredKind => entry.kind === filteredKind));
  return quickInfo;
  // return map(quickInfo, "name");
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
