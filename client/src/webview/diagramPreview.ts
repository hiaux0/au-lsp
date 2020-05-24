import * as vscode from 'vscode';
import { TextDocumentContentProvider } from './TextDocumentContentProvider';
import { LanguageClient } from 'vscode-languageclient';
import * as path from 'path';

export function registerDiagramPreview(context: vscode.ExtensionContext, client: LanguageClient) {

	const aureliaViewDataPanelType = 'aureliaViewData';

	let previewUri = vscode.Uri.parse('aurelia-preview://authority/aurelia-preview');

	let provider = new TextDocumentContentProvider(client);
	let registration = vscode.workspace.registerTextDocumentContentProvider('aurelia-preview', provider);
	let isPanelVisible: boolean = false;
	let panel: vscode.WebviewPanel;

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

	context.subscriptions.push(vscode.commands.registerCommand('aurelia.openClassMethodsHierarchy', async () => {
		const classDiagram = await client.sendRequest<any>('aurelia-class-diagram')

		panel = vscode.window.createWebviewPanel(
			aureliaViewDataPanelType,
			'Aurelia view data',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
			}
		);

		panel.webview.html = fillWebViewHtml(panel, classDiagram);

    /**
     * Set panel visible flag to true, if
     * - we have the correct WebView type (multiple WebView types possible)
     * - and panel itself is not active
     */
		panel.onDidChangeViewState(event => {
			const correctPanelType = (event.webviewPanel.viewType === aureliaViewDataPanelType);
			/** Don't update panel if the panel itself is 'active' */
			const panelNotActive = !event.webviewPanel.active
			isPanelVisible = correctPanelType && panelNotActive;
		});

		panel.onDidDispose(event => {
			isPanelVisible = false;
		});

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