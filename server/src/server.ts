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
} from "vscode-languageserver";

import { TextDocument } from "vscode-languageserver-textdocument";

// We need to import this to include reflect functionality
import "reflect-metadata";

import { Container } from "aurelia-dependency-injection";

import {
  DocumentSettings,
  ExampleSettings,
} from "./configuration/DocumentSettings";
import { TextDocumentChange } from "./textDocumentChange/TextDocumentChange";
import { aureliaProgram } from "./viewModel/AureliaProgram";
import { createAureliaWatchProgram } from "./viewModel/createAureliaWatchProgram";
import { getAureliaComponentMap } from "./viewModel/getAureliaComponentMap";
import { getAureliaComponentList } from "./viewModel/getAureliaComponentList";
import {
  LanguageModes,
  getLanguageModes,
} from "./embeddedLanguages/languageModes";
import { aureliaLanguageId } from "./embeddedLanguages/embeddedSupport";
import {
  getVirtualCompletion,
  createVirtualCompletionSourceFile,
  getVirtualViewModelCompletion,
} from "./virtualCompletion/virtualCompletion";

import * as path from "path";
import * as ts from "typescript";
import { createDiagram } from "./viewModel/createDiagram";
import {
  getVirtualDefinition,
  VirtualDefinitionResult,
} from "./virtual/virtualDefinition";
import { getDefinition } from "./definition/getDefinition";

const globalContainer = new Container();
const DocumentSettingsClass = globalContainer.get(DocumentSettings);
const TextDocumentChangeClass = globalContainer.get(TextDocumentChange);

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;
let languageModes: LanguageModes;

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

  /** ********************** */
  /** Embedded Language Mode */
  /** ********************** */
  languageModes = getLanguageModes();

  documents.onDidClose((e) => {
    languageModes.onDocumentRemoved(e.document);
  });
  connection.onShutdown(() => {
    languageModes.dispose();
  });

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [" ", ".", "[", '"', "'", "{", "<"],
      },
      definitionProvider: true,
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
    getAureliaComponentMap(aureliaProgram);
    const componentList = getAureliaComponentList(aureliaProgram);
    if (componentList) {
      aureliaProgram.setComponentList(componentList);
    }
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

  // Revalidate all open text documents
  documents.all().forEach(TextDocumentChangeClass.validateTextDocument);
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
  getAureliaComponentMap(aureliaProgram);
  const componentList = getAureliaComponentList(aureliaProgram);
  if (componentList) {
    aureliaProgram.setComponentList(componentList);
  }

  TextDocumentChangeClass.inject(
    connection,
    hasDiagnosticRelatedInformationCapability
  );
  TextDocumentChangeClass.validateTextDocument(change.document);
});

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log("We received an file change event");
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const documentUri = _textDocumentPosition.textDocument.uri;
    const document = documents.get(documentUri);
    if (!document) {
      throw new Error("No document found");
      return [];
    }
    // Embedded Language

    // Virtual file
    const virtualCompletions = getVirtualViewModelCompletion(
      _textDocumentPosition,
      document,
      aureliaProgram
    );

    if (virtualCompletions.length > 0) {
      return virtualCompletions;
    }

    const text = document.getText();
    const offset = document.offsetAt(_textDocumentPosition.position);
    const triggerCharacter = text.substring(offset - 1, offset);

    switch (triggerCharacter) {
      case "<": {
        return [...aureliaProgram.getComponentMap().classDeclarations!];
      }
      case " ": {
        return [...aureliaProgram.getComponentMap().bindables!];
      }
    }

    return [];

    // const mode = languageModes.getModeAtPosition(document!, _textDocumentPosition.position);
    // // console.log("TCL: mode", mode)
    // if (typeof mode === 'string') {
    // 	console.log('heeeeeeeeeeeeeeee')
    // 	return [CompletionItem.create('LETS DO IT')]
    // }

    // // The pass parameter contains the position of the text document in
    // // which code complete got requested. For the example we ignore this
    // // info and always provide the same completion items.
    // return [
    // 	...aureliaProgram.getComponentMap().classDeclarations!,
    // 	...aureliaProgram.getComponentMap().classMembers!,
    // 	...aureliaProgram.getComponentMap().bindables!,
    // ]
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      item.detail = "TypeScript details";
      item.documentation = "TypeScript documentation";
    } else if (item.data === 2) {
      item.detail = "JavaScript details";
      item.documentation = "JavaScript documentation";
    }
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

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.textDocument.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

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
  ({
    documentContent,
    position,
    goToSourceWord,
    filePath,
  }): VirtualDefinitionResult | any => {
    try {
      const document = TextDocument.create(
        filePath,
        "html",
        0,
        documentContent
      );
      const definitions = getDefinition(
        document,
        position,
        aureliaProgram,
        goToSourceWord
      );

      if (!definitions.viewModelFilePath)
        throw new Error(`No file found for: >>${goToSourceWord}<<`);

      return getDefinition(document, position, aureliaProgram, goToSourceWord);
    } catch (err) {
      return getVirtualDefinition(filePath, aureliaProgram, goToSourceWord);
      console.log(err);
    }
  }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
