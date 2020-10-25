/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import * as vscode from "vscode";
import {
  workspace,
  commands,
  ExtensionContext,
  OutputChannel,
  CompletionItemProvider,
  CancellationToken,
  CompletionList,
  CompletionContext,
  CompletionItem,
} from "vscode";
import * as WebSocket from "ws";
import * as ts from "typescript";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient";
import { registerDiagramPreview } from "./webview/diagramPreview";
import { RelatedFiles } from "./feature/relatedFiles";

let client: LanguageClient;

class CompletionItemProviderInView implements CompletionItemProvider {
  public constructor(private readonly client: LanguageClient) {}

  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: CancellationToken,
    context: CompletionContext
  ): Promise<CompletionItem[] | CompletionList> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const triggerCharacter = text.substring(offset - 1, offset);
    return this.client.sendRequest<any>(
      "aurelia-get-component-class-declarations"
    );
  }
}

class SearchDefinitionInView implements vscode.DefinitionProvider {
  public client: LanguageClient;

  public constructor(client: LanguageClient) {
    this.client = client;
  }

  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.DefinitionLink[]> {
    const goToSourceWordRange = document.getWordRangeAtPosition(position);
    const goToSourceWord = document.getText(goToSourceWordRange);
    const result = await this.client.sendRequest<{
      lineAndCharacter: ts.LineAndCharacter;
      viewModelFilePath: string;
    }>("get-virtual-definition", {
      goToSourceWord,
      filePath: document.uri.path,
    });

    const { line, character } = result.lineAndCharacter;

    return [
      {
        targetUri: vscode.Uri.file(result.viewModelFilePath),
        targetRange: new vscode.Range(
          new vscode.Position(line - 1, character),
          new vscode.Position(line, character)
        ),
      },
    ];
  }
}

export function activate(context: ExtensionContext) {
  const socketPort = workspace
    .getConfiguration("languageServerExample")
    .get("port", 7000);
  let socket: WebSocket | null = null;

  commands.registerCommand("languageServerExample.startStreaming", () => {
    // Establish websocket connection
    socket = new WebSocket(`ws://localhost:${socketPort}`);
  });

  // The server is implemented in node
  let serverModule = context.asAbsolutePath(
    path.join("server", "out", "server.js")
  );
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // The log to send
  let log = "";
  const websocketOutputChannel: OutputChannel = {
    name: "websocket",
    // Only append the logs but send them later
    append(value: string) {
      log += value;
      console.log(value);
    },
    appendLine(value: string) {
      log += value;
      // Don't send logs until WebSocket initialization
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(log);
      }
      log = "";
    },
    clear() {},
    show() {},
    hide() {},
    dispose() {},
  };

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    outputChannelName: "Aurelia v2",
    documentSelector: [{ scheme: "file", language: "html" }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
    // Hijacks all LSP logs and redirect them to a specific port through WebSocket connection
    // outputChannel: websocketOutputChannel
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "languageServerExample",
    "Aurelia v2",
    serverOptions,
    clientOptions
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aurelia.getAureliaComponents",
      async () => {
        console.log("Getting...");
        const components = await client.sendRequest(
          "aurelia-get-component-list"
        );
        console.clear();
        console.log("TCL: activate -> components", components);
      }
    )
  );

  context.subscriptions.push(new RelatedFiles());

  /** TODO: This is only needed for test files, in tests, the server.ts completion listener does not trigger as to my current knowledge */
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: "file", language: "html" },
      new CompletionItemProviderInView(client)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { scheme: "file", language: "html" },
      new SearchDefinitionInView(client)
    )
  );

  registerDiagramPreview(context, client);

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
