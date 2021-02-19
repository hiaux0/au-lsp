import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient';

export class TextDocumentContentProvider
  implements vscode.TextDocumentContentProvider {
  constructor(private readonly client: LanguageClient) {}

  private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();

  public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const editor = vscode.window.activeTextEditor;
    if (!vscode.window.activeTextEditor.document) {
      return Promise.resolve('<p>no data</p>');
    }
    const fileName = vscode.window.activeTextEditor.document.fileName;

    let headerHTML = `<h1>Component: '${'Aurelia v2'}'</h1>`;
    headerHTML += '<h2>Files</h2><ul>';
    headerHTML += '</ul>';

    const viewModelHTML = '<h2>no viewmodel found</h2>';

    const viewHTML = '<h2>No view found</h2>';

    const classesHTML = '<h2>no extra classes found</h2>';
    return `<body><style>pre { border: 1px solid #333; display: block; background: #1a1a1a; margin: 1rem;color: #999; }</style>
        ${headerHTML}
        <hr>
        ${viewModelHTML}
        <hr>
        ${viewHTML}
        <hr>
        ${classesHTML}
        <br><br>
      </body>`;
  }

  get onDidChange(): vscode.Event<vscode.Uri> {
    return this._onDidChange.event;
  }

  public update(uri: vscode.Uri) {
    this._onDidChange.fire(uri);
    return this.provideTextDocumentContent(uri);
  }
}
