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
 * Create "virtual" program.
 * Act like normal program, but takes a "virtual" file.
 *
 * Usecase: Take part of html file, make it virtual, and thus allow typescript completion
 */
export function createVirtualProgram(virtualContent: string) {
  const virtualProgram = createProgram([
    { fileName: VIRTUAL_SOURCE_FILENAME, content: virtualContent },
  ]);

  return virtualProgram;
}

/**
 * With a virtual program, create a completions from a virtual file.
 */
export function createVirtualCompletion(
  virtualProgram: ts.Program,
  viewModelContent: string,
  virtualContent: string
) {
  virtualProgram.getSourceFiles().forEach((sourceFile) => {
    if (sourceFile.fileName !== VIRTUAL_SOURCE_FILENAME) return;

    // modify text
    // 1.3
    function createTempCompletion(
      classIdentifierEndIndex: number,
      targetClassName: string
    ) {
      const originalText = sourceFile.getText();
      const classNameToOpeningBracketRegex = new RegExp(
        `${targetClassName}(.*?{)`
      );
      const regexResult = classNameToOpeningBracketRegex.exec(
        sourceFile.getText()
      );
      if (!regexResult)
        throw new Error('Nothing matched the "class name to bracket regex"');

      const toOpeningBracketLength = regexResult[1]?.length;
      const toCut = classIdentifierEndIndex + toOpeningBracketLength;
      const starter = originalText.slice(0, toCut);
      const ender = originalText.slice(toCut);

      const tempMethodTextStart = `temp() {this.`;
      const tempMethodTextEnd = "};\n  ";
      const tempMethodText = tempMethodTextStart + virtualContent + tempMethodTextEnd;

      // 1.3.1
      const tempWithCompletion = starter + tempMethodText + ender;
      console.log('TCL: tempWithCompletion', tempWithCompletion)
      const tempProgram = createProgram([
        { fileName: "temp.ts", content: tempWithCompletion },
      ]);
      const tempTargetSourcefile = tempProgram.getSourceFiles()[0];

      const completionIndex =
        classIdentifierEndIndex + tempMethodTextStart.length + virtualContent.length - 2;

    //   createCompletion(
    //     tempProgram,
    //     tempTargetSourcefile,
    //     completionIndex
    //   ); /*?*/
    }

    // 1.3.2
    visit(sourceFile, (n, level) => {
      const targetClassName = "MyCompoCustomElement";
      const targetClass = n.getText() === targetClassName;
      if (targetClass) {
        sourceFile.getText();
        const classEndIndex = n.getEnd();
        createTempCompletion(classEndIndex, targetClassName);
      }
    });
  });
}

/**
 * Returns the virtual competion. (to be used as real completions)
 */
export function getVirtualCompletion() {}

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
