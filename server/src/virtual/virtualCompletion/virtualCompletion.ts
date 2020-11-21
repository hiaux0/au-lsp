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

interface EntryDetailsMapData {
  displayParts: string | undefined;
  documentation: string | undefined;
  kind: CompletionItemKind;
  methodArguments: string[];
}

interface EntryDetailsMap {
  [key: string]: EntryDetailsMapData;
}

import * as ts from "typescript";
import * as path from "path";
import {
  CompletionItem,
  InsertTextFormat,
  TextDocument,
} from "vscode-css-languageservice";
import {
  CompletionItemKind,
  MarkupKind,
  TextDocumentPositionParams,
} from "vscode-languageserver";
import { ViewRegionInfo } from "../../feature/embeddedLanguages/embeddedSupport";
import { getDocumentRegionAtPosition } from "../../feature/embeddedLanguages/languageModes";
import { aureliaProgram, AureliaProgram } from "../../viewModel/AureliaProgram";
import { AureliaLSP, VIRTUAL_SOURCE_FILENAME } from "../../common/constants";
import { createVirtualViewModelSourceFile } from "../virtualSourceFile";
import { AsyncReturnType } from "../../common/global";

const PARAMETER_NAME = "parameterName";
const PROPERTY_NAME = "propertyName";
const METHOD_NAME = "methodName";

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

  if (!cls) throw new Error("No cls");

  const virtualCompletions = cls.getCompletionsAtPosition(
    sourceFile.fileName,
    positionOfAutocomplete,
    undefined
  )?.entries;

  if (!virtualCompletions) {
    throw new Error("No completions found");
  }

  const virtualCompletionEntryDetails = virtualCompletions.map((completion) => {
    return cls.getCompletionEntryDetails(
      sourceFile.fileName,
      positionOfAutocomplete,
      completion.name,
      undefined,
      undefined,
      undefined
    ); /*?*/
  });

  return { virtualCompletions, virtualCompletionEntryDetails };
}

/** [Ignore] Seems useful, so keeping it for now */
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

export interface AureliaCompletionItem extends CompletionItem {
  data?: AureliaLSP.AureliaCompletionItemDataType;
}

export async function getVirtualViewModelCompletion(
  textDocumentPosition: TextDocumentPositionParams,
  document: TextDocument,
  aureliaProgram: AureliaProgram
): Promise<AureliaCompletionItem[]> {
  // 1. From the region get the part, that should be made virtual.
  const documentUri = textDocumentPosition.textDocument.uri;
  const region = await getDocumentRegionAtPosition(
    textDocumentPosition.position
  ).get(document);

  if (!region) return [];

  const virtualContent = document
    .getText()
    .slice(region.startOffset, region.endOffset);

  // 2. Get original viewmodel file from view
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
    throw new Error(`No source file found for current view: ${documentUri}`);
  }

  const componentList = aureliaProgram.getComponentList();
  const customElementClassName = componentList.find(
    (component) =>
      component.baseFileName === path.parse(targetSourceFile.fileName).name
  )?.className;

  if (!customElementClassName) return [];

  // 3. Create virtual completion
  const virtualViewModelSourceFile = ts.createSourceFile(
    "virtual.ts",
    targetSourceFile?.getText(),
    99
  );
  const {
    virtualSourcefile,
    virtualCursorIndex,
  } = createVirtualViewModelSourceFile(
    virtualViewModelSourceFile,
    virtualContent,
    customElementClassName
  );

  // 4. Use TLS
  const {
    virtualCompletions,
    virtualCompletionEntryDetails,
  } = getVirtualCompletion(virtualSourcefile, virtualCursorIndex);

  if (!virtualCompletions) {
    console.log(`
      We were trying to find completions for: ${virtualContent},
      but couldn't find anything in the view model: ${documentUri}
    `);
    return [];
  }

  if (!virtualCompletionEntryDetails) {
    return [];
  }

  const entryDetailsMap: EntryDetailsMap = {};

  const result = enhanceCompletionItemDocumentation(
    virtualCompletionEntryDetails,
    entryDetailsMap,
    virtualCompletions
  );

  return result as AureliaCompletionItem[];
}

interface CustomizeEnhanceDocumentation {
  /** Array of the arguments of the method (without types) */
  customEnhanceMethodArguments?: (methodArguments: string[]) => string;
  omitMethodNameAndBrackets?: boolean;
}

/**
 * Pass in arbitrary content for the virtual file.
 *
 * Cf. getVirtualViewModelCompletion
 * Here, we go by document region
 */
export function getVirtualViewModelCompletionSupplyContent(
  aureliaProgram: AureliaProgram,
  virtualContent: string,
  targetSourceFile: ts.SourceFile,
  /**
   * Identify the correct class in the view model file
   */
  viewModelClassName: string,
  customizeEnhanceDocumentation?: CustomizeEnhanceDocumentation
): AureliaCompletionItem[] {
  // 3. Create virtual completion
  const virtualViewModelSourceFile = ts.createSourceFile(
    VIRTUAL_SOURCE_FILENAME,
    targetSourceFile?.getText(),
    99
  );
  const {
    virtualSourcefile,
    virtualCursorIndex,
  } = createVirtualViewModelSourceFile(
    virtualViewModelSourceFile,
    virtualContent,
    viewModelClassName
  );

  const {
    virtualCompletions,
    virtualCompletionEntryDetails,
  } = getVirtualCompletion(virtualSourcefile, virtualCursorIndex);

  if (!virtualCompletions) {
    console.log(`
      We were trying to find completions for: ${virtualContent},
    `);
    return [];
  }

  if (!virtualCompletionEntryDetails) {
    return [];
  }

  const entryDetailsMap: EntryDetailsMap = {};

  const result = enhanceCompletionItemDocumentation(
    virtualCompletionEntryDetails,
    entryDetailsMap,
    virtualCompletions,
    customizeEnhanceDocumentation
  );

  return (result as unknown) as AureliaCompletionItem[];
}

function enhanceCompletionItemDocumentation(
  virtualCompletionEntryDetails: (ts.CompletionEntryDetails | undefined)[],
  entryDetailsMap: EntryDetailsMap,
  virtualCompletions: ts.CompletionEntry[],
  customizeEnhanceDocumentation?: CustomizeEnhanceDocumentation
) {
  const kindMap = {
    [ts.ScriptElementKind[
      "memberVariableElement"
    ] as ts.ScriptElementKind]: CompletionItemKind.Field,
    [ts.ScriptElementKind[
      "memberFunctionElement"
    ] as ts.ScriptElementKind]: CompletionItemKind.Method,
  };

  virtualCompletionEntryDetails.reduce((acc, entryDetail) => {
    if (!entryDetail) return acc;

    acc[entryDetail.name!] = {
      displayParts: entryDetail.displayParts?.map((part) => part.text).join(""),
      documentation: entryDetail.documentation?.map((doc) => doc.text).join(""),
      kind: kindMap[entryDetail.kind],
      methodArguments: entryDetail.displayParts
        .filter((part) => part.kind === PARAMETER_NAME)
        .map((part) => part.text),
    };
    return acc;
  }, entryDetailsMap);

  /** ${1: argName1}, ${2: argName2} */
  function createArgCompletion(entryDetail: EntryDetailsMapData) {
    const numOfArguments = entryDetail;

    if (customizeEnhanceDocumentation?.customEnhanceMethodArguments) {
      return customizeEnhanceDocumentation.customEnhanceMethodArguments(
        entryDetail.methodArguments
      );
    }

    return entryDetail.methodArguments
      .map((argName, index) => {
        return `\${${index + 1}:${argName}}`;
      })
      .join(", ");
  }

  const result = virtualCompletions.map((tsCompletion) => {
    const entryDetail = entryDetailsMap[tsCompletion.name];
    const isMethod = entryDetail.kind === CompletionItemKind.Method;
    /** Default value is just the method name */
    let insertMethodTextWithArguments = tsCompletion.name;
    if (isMethod) {
      if (customizeEnhanceDocumentation?.omitMethodNameAndBrackets) {
        insertMethodTextWithArguments = createArgCompletion(entryDetail);
      } else {
        insertMethodTextWithArguments =
          tsCompletion.name + "(" + createArgCompletion(entryDetail) + ")";
      }
    }

    const completionItem: AureliaCompletionItem = {
      documentation: {
        kind: MarkupKind.Markdown,
        value: entryDetail.documentation || "",
      },
      detail: entryDetail.displayParts || "",
      insertText: isMethod ? insertMethodTextWithArguments : tsCompletion.name,
      insertTextFormat: InsertTextFormat.Snippet,
      kind: entryDetail.kind,
      label: tsCompletion.name,
      data: AureliaLSP.AureliaCompletionItemDataType,
    };
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
  });
  return result;
}

/**
 * Convert Value Converter's `toView` to view format.
 *
 * @example
 * ```ts
 * // TakeValueConverter
 *   toView(array, count)
 * ```
 *   -->
 * ```html
 *   array | take:count
 * ```
 *
 */
export function enhanceValueConverterViewArguments(methodArguments: string[]) {
  // 1. Omit the first argument, because that's piped to the method
  const [_, ...viewArguments] = methodArguments;

  // 2. prefix with :
  const result = viewArguments
    .map((argName, index) => {
      return `\${${index + 1}:${argName}}`;
    })
    .join(":");

  return result;
}

export async function getAureliaVirtualCompletions(
  _textDocumentPosition: TextDocumentPositionParams,
  document: TextDocument
) {
  // Virtual file
  let virtualCompletions: AsyncReturnType<typeof getVirtualViewModelCompletion> = [];
  try {
    virtualCompletions = await getVirtualViewModelCompletion(
      _textDocumentPosition,
      document,
      aureliaProgram
    );
  } catch (err) {
    console.log("onCompletion 261 TCL: err", err);
  }

  const aureliaVirtualCompletions = virtualCompletions.filter((completion) => {
    const isAureliaRelated =
      completion.data === AureliaLSP.AureliaCompletionItemDataType;
    const isUnrelatedTypescriptCompletion = completion.kind === undefined;
    const wantedResult = isAureliaRelated && !isUnrelatedTypescriptCompletion;
    return wantedResult;
  });

  return aureliaVirtualCompletions;
}
