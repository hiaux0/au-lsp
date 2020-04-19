/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import 'reflect-metadata';

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
	InitializeResult
} from 'vscode-languageserver';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

// We need to import this to include reflect functionality
import 'reflect-metadata';
import { Container } from 'aurelia-dependency-injection';

import { DocumentSettings, ExampleSettings } from './configuration/DocumentSettings';
import { TextDocumentChange } from './textDocumentChange/TextDocumentChange';
import { AureliaProgram } from './viewModel/AureliaProgram';
import { createAureliaWatchProgram } from './viewModel/createAureliaWatchProgram';
import { createAureliaComponentMap } from './viewModel/createAureliaComponentMap';

const globalContainer = new Container();
const DocumentSettingsClass = globalContainer.get(DocumentSettings);
const TextDocumentChangeClass = globalContainer.get(TextDocumentChange);
const aureliaProgram = globalContainer.get(AureliaProgram);


// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize(async (params: InitializeParams) => {
	console.log('------------------------------------------------------------------------------------------');
	console.log('------------------------------------------------------------------------------------------');
	console.log('1. TCL: onInitialize');
	console.log('------------------------------------------------------------------------------------------');
	console.log('------------------------------------------------------------------------------------------');
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

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Full,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}

	// Injections
	DocumentSettingsClass.inject(connection, hasConfigurationCapability);


	return result;
});

connection.onInitialized(async () => {
	console.log('------------------------------------------------------------------------------------------');
	console.log('------------------------------------------------------------------------------------------');
	console.log('2. TCL: onInitialized');
	console.log('------------------------------------------------------------------------------------------');
	console.log('------------------------------------------------------------------------------------------');
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);

		await createAureliaWatchProgram(aureliaProgram);
		createAureliaComponentMap(aureliaProgram);

	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

connection.onDidChangeConfiguration(change => {
	console.log('------------------------------------------------------------------------------------------');
	console.log('------------------------------------------------------------------------------------------');
	console.log('3. TCL: onDidChangeConfiguration');
	console.log('------------------------------------------------------------------------------------------');
	console.log('------------------------------------------------------------------------------------------');
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		DocumentSettingsClass.settingsMap.clear();
	} else {
		DocumentSettingsClass.globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || DocumentSettingsClass.defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(TextDocumentChangeClass.validateTextDocument);
});


// Only keep settings for open documents
documents.onDidClose(e => {
	DocumentSettingsClass.settingsMap.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(async change => {
	console.log('------------------------------------------------------------------------------------------');
	console.log('------------------------------------------------------------------------------------------');
	console.log('4. TCL: onDidChangeContent');
	console.log('------------------------------------------------------------------------------------------');
	console.log('------------------------------------------------------------------------------------------');
	TextDocumentChangeClass.inject(connection, hasDiagnosticRelatedInformationCapability);
	TextDocumentChangeClass.validateTextDocument(change.document);
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

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

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
