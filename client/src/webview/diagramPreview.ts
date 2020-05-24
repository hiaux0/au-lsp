import * as vscode from 'vscode';
import { TextDocumentContentProvider } from './TextDocumentContentProvider';
import { LanguageClient } from 'vscode-languageclient';
import * as path from 'path';

export function registerDiagramPreview(context: vscode.ExtensionContext, client: LanguageClient) {


	let previewUri = vscode.Uri.parse('aurelia-preview://authority/aurelia-preview');

	let provider = new TextDocumentContentProvider(client);
	let registration = vscode.workspace.registerTextDocumentContentProvider('aurelia-preview', provider);
	let isPanelVisible: boolean = false;
	let panel: vscode.WebviewPanel;

	context.subscriptions.push(vscode.commands.registerCommand('aurelia.openClassMethodsHierarchy', async () => {
		const activeEditorPath = '';
		const classDiagram = await client.sendRequest<any>('aurelia-class-diagram', activeEditorPath);
		DiagramPreviewPanel.createPanel('', classDiagram)
	}));
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function fillWebViewHtml(panel: vscode.WebviewPanel, classDiagram: string): string {
	const mermaidSrc = path.resolve(__dirname, '../../../../../', 'client/src/webview/index.bundle.js');
	const scriptPathOnDisk = vscode.Uri.file(mermaidSrc);
	// And the uri we use to load this script in the webview
	const mermaidSrcUri = panel.webview.asWebviewUri(scriptPathOnDisk);

	// Use a nonce to whitelist which scripts can be run
	const nonce = getNonce();

	return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cat Coding</title>
				</head>
				<body>
					<h1 id="lines-of-code-counter">0</h1>
					<div class="mermaid">
					${classDiagram}
					</div>

					<script nonce="${nonce}" src="${mermaidSrcUri}"></script>
				</body>
      </html>
    `;
}

/**
 * TODO: this could be a generic webview
 */
class DiagramPreviewPanel {
	public static currentPath: string;
	public static currentPanel: DiagramPreviewPanel;
	public static readonly viewType = 'aureliaDiagramPanel';

	private readonly webViewPanel: vscode.WebviewPanel;
	private readonly isPanelVisible: boolean;

	constructor(panel: DiagramPreviewPanel, currentPath?: string) {

	}

	/**
	 * Create web view panel with diagram of class in active editor.
	 */
	public static async createPanel(filePath: string, content: string) {
		// 1. get current path
		if (!DiagramPreviewPanel.currentPath) {
			DiagramPreviewPanel.currentPath = filePath;
		}

		const panel = vscode.window.createWebviewPanel(
			DiagramPreviewPanel.viewType,
			'Aurelia view data',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
			}
		);

		panel.webview.html = fillWebViewHtml(panel, content);

		// /**
		//  * Set panel visible flag to true, if
		//  * - we have the correct WebView type (multiple WebView types possible)
		//  * - and panel itself is not active
		//  */
		// panel.onDidChangeViewState(event => {
		// 	const correctPanelType = (event.webviewPanel.viewType === DiagramPreviewPanel.viewType);
		// 	/** Don't update panel if the panel itself is 'active' */
		// 	const panelNotActive = !event.webviewPanel.active
		// 	this.isPanelVisible = correctPanelType && panelNotActive;
		// });

		// panel.onDidDispose(event => {
		// 	this.isPanelVisible = false;
		// });
	}

	/**
	 * Refresh the panel, if the underlying data changed
	 */
	public static refreshPanel() {

	}

}