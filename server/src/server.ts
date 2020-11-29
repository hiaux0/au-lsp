import { AsyncReturnType } from "./common/global.d";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import "reflect-metadata";

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionList,
  InsertTextFormat,
  Definition,
  MarkupKind,
  MarkupContent,
} from "vscode-languageserver";

import { TextDocument } from "vscode-languageserver-textdocument";
import {
  getLanguageModes,
  LanguageModes,
  Position,
} from "./feature/embeddedLanguages/languageModes";

// We need to import this to include reflect functionality
import "reflect-metadata";

import { Container } from "aurelia-dependency-injection";

import {
  DocumentSettings,
  ExampleSettings,
} from "./configuration/DocumentSettings";
import { aureliaProgram } from "./viewModel/AureliaProgram";
import { createAureliaWatchProgram } from "./viewModel/createAureliaWatchProgram";
import {
  CustomElementRegionData,
  parseDocumentRegions,
  ViewRegionType,
} from "./feature/embeddedLanguages/embeddedSupport";
import { AureliaCompletionItem } from "./virtual/virtualCompletion/virtualCompletion";

import * as path from "path";
import * as ts from "typescript";
import { createDiagram } from "./viewModel/createDiagram";
import { getVirtualDefinition } from "./virtual/virtualDefinition/virtualDefinition";
import {
  DefinitionResult,
  getDefinition,
} from "./feature/definition/getDefinition";
import { camelCase } from "@aurelia/kernel";

const globalContainer = new Container();
const DocumentSettingsClass = globalContainer.get(DocumentSettings);

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
export let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let languageModes: LanguageModes;

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize(async (params: InitializeParams) => {
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  console.log("1. TCL: onInitialize");
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  let capabilities = params.capabilities;
  languageModes = await getLanguageModes();

  // Does the client support the `workspace/configuration` request?
  // If not, we will fall back using global settings
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [" ", ".", "[", '"', "'", "{", "<", ":"],
      },
      definitionProvider: true,
      hoverProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  // Injections
  DocumentSettingsClass.inject(connection, hasConfigurationCapability);

  return result;
});

connection.onInitialized(async () => {
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  console.log("2. TCL: onInitialized");
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );

    await createAureliaWatchProgram(aureliaProgram);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

connection.onDidChangeConfiguration((change) => {
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  console.log("3. TCL: onDidChangeConfiguration");
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    DocumentSettingsClass.settingsMap.clear();
  } else {
    DocumentSettingsClass.globalSettings = <ExampleSettings>(
      (change.settings.languageServerExample ||
        DocumentSettingsClass.defaultSettings)
    );
  }
});

// Only keep settings for open documents
documents.onDidClose((e) => {
  DocumentSettingsClass.settingsMap.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(async (change) => {
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  console.log("4. TCL: onDidChangeContent");
  console.log(
    "------------------------------------------------------------------------------------------"
  );
  languageModes = await getLanguageModes();
});

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log("We received an file change event");
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  async (
    _textDocumentPosition: TextDocumentPositionParams
  ): Promise<CompletionItem[] | CompletionList> => {
    const documentUri = _textDocumentPosition.textDocument.uri;
    const document = documents.get(documentUri);
    if (!document) {
      throw new Error("No document found");
      return [];
    }
    const modeAndRegion = await languageModes.getModeAndRegionAtPosition(
      document,
      _textDocumentPosition.position
    );

    if (!modeAndRegion) return [];
    const { mode, region } = modeAndRegion;

    if (!mode) return [];

    const doComplete = mode.doComplete!;
    const text = document.getText();
    const offset = document.offsetAt(_textDocumentPosition.position);
    const triggerCharacter = text.substring(offset - 1, offset);

    if (doComplete) {
      let completions: CompletionItem[] = [CompletionItem.create("")];
      try {
        completions = ((await doComplete(
          document,
          _textDocumentPosition,
          triggerCharacter
        )) as unknown) as CompletionItem[];
      } catch (error) {
        console.log("TCL: error", error);
      }
      return completions;
    }

    return [];
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    return item;
  }
);

connection.onDefinition((_: TextDocumentPositionParams): Definition | null => {
  /**
   * Need to have this onDefinition here, else we get following error in the console
   * Request textDocument/definition failed.
   * Message: Unhandled method textDocument/definition
   * Code: -32601
   */
  return null;
});

connection.onHover((hoverParams) => {
  return null;
});

/** On requests */
connection.onRequest("aurelia-class-diagram", async (filePath: string) => {
  // 1. Find the active component
  const aureliaSourceFiles = aureliaProgram.getAureliaSourceFiles();
  const filePathDir = path.dirname(filePath);
  const componentName = path.parse(filePath).name;
  const targetSourceFile = aureliaSourceFiles?.find((sourceFile) => {
    const sameDir = path.dirname(sourceFile.fileName) === filePathDir;
    const sameComponent =
      path.parse(sourceFile.fileName).name === componentName;
    /** Need both, since possibility of same component name in different directories */
    return sameDir && sameComponent;
  });
  if (!targetSourceFile) {
    console.log(
      `No target file for: ${filePath} in all your ${aureliaSourceFiles?.map(
        (sf) => sf.fileName
      )}`
    );
  }

  // 2. create diagram by going through the class ast
  let classDiagram = "";
  targetSourceFile?.forEachChild((fileMembers) => {
    if (ts.isClassDeclaration(fileMembers)) {
      const checker = aureliaProgram.getProgram()?.getTypeChecker();
      if (!checker) {
        console.log("no checker");
      }
      classDiagram = createDiagram(fileMembers!, checker!);
    }
  });
  console.log("TCL: classDiagram", classDiagram);

  return classDiagram;
});

connection.onRequest("aurelia-get-component-list", () => {
  return aureliaProgram.getComponentList();
});

connection.onRequest("aurelia-get-component-class-declarations", () => {
  return aureliaProgram.getComponentMap().classDeclarations;
});

connection.onRequest(
  "get-virtual-definition",
  async ({
    documentContent,
    position,
    goToSourceWord,
    filePath,
  }): Promise<DefinitionResult | undefined> => {
    const documentUri = filePath;
    const document = TextDocument.create(filePath, "html", 0, documentContent);
    const isRefactor = true;

    if (!document) {
      throw new Error("No document found");
      return;
    }

    const modeAndRegion = await languageModes.getModeAndRegionAtPosition(
      document,
      position
    );

    if (!modeAndRegion) return;
    const { mode, region } = modeAndRegion;

    if (!mode) return;

    const doDefinition = mode.doDefinition!;

    if (doDefinition && isRefactor) {
      let definitions: AsyncReturnType<typeof doDefinition>;

      try {
        definitions = await doDefinition(
          document,
          position,
          goToSourceWord,
          region
        );
      } catch (error) {
        console.log("TCL: error", error);
        return;
      }
      return definitions;
    }

    console.log("---------------------------------------");
    console.log("---------------------------------------");
    console.log("---------------------------------------");
    console.log("---------------------------------------");
    console.log("LEGACY DEFINITON");
    console.log("---------------------------------------");
    console.log("---------------------------------------");
    console.log("---------------------------------------");
    console.log("---------------------------------------");

    try {
      const definitions = await getDefinition(
        document,
        position,
        aureliaProgram,
        goToSourceWord
      );

      return definitions;
    } catch (err) {
      const virtualDefinition = getVirtualDefinition(
        filePath,
        aureliaProgram,
        goToSourceWord
      );
      /**
       * 1. inter-bindable.bind=">increaseCounter()<"
       */
      if (
        virtualDefinition?.lineAndCharacter.line !== 0 &&
        virtualDefinition?.lineAndCharacter.character !== 0
      ) {
        return virtualDefinition;
      }

      /**
       * 2. >inter-bindable<.bind="increaseCounter()"
       */

      /** Region from FE starts at index 0, BE region starts at 1 */
      const adjustedPosition: Position = {
        character: position.character + 1,
        line: position.line + 1,
      };
      const regions = await parseDocumentRegions<CustomElementRegionData>(
        document
      );
      const targetCustomElementRegion = regions
        .filter((region) => region.type === ViewRegionType.CustomElement)
        .find((customElementRegion) => {
          return customElementRegion.data?.find((customElementAttribute) =>
            customElementAttribute.attributeName?.includes(goToSourceWord)
          );
        });

      if (!targetCustomElementRegion) return;

      const aureliaSourceFiles = aureliaProgram.getAureliaSourceFiles();
      const targetAureliaFile = aureliaSourceFiles?.find((sourceFile) => {
        return (
          path.parse(sourceFile.fileName).name ===
          targetCustomElementRegion.tagName
        );
      });

      if (!targetAureliaFile) return;

      const sourceWordCamelCase = camelCase(goToSourceWord);
      return getVirtualDefinition(
        targetAureliaFile.fileName,
        aureliaProgram,
        sourceWordCamelCase
      );

      console.log(err);
    }
  }
);

connection.onRequest(
  "get-virtual-hover",
  async ({
    documentContent,
    position,
    goToSourceWord,
    filePath,
  }): Promise<void> => {
    const documentUri = filePath;
    const document = TextDocument.create(filePath, "html", 0, documentContent);

    if (!document) {
      throw new Error("No document found");
      return;
    }

    const modeAndRegion = await languageModes.getModeAndRegionAtPosition(
      document,
      position
    );

    if (!modeAndRegion) return;
    const { mode, region } = modeAndRegion;

    if (!mode) return;

    const doHover = mode.doHover;

    if (doHover) {
      let hoverResult: AsyncReturnType<typeof doHover>;

      try {
        hoverResult = await doHover(document, position, goToSourceWord, region);
      } catch (error) {
        console.log("TCL: error", error);
        return;
      }
      return hoverResult;
    }
  }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
