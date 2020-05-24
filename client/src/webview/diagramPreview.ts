import * as vscode from 'vscode';
import { TextDocumentContentProvider } from './TextDocumentContentProvider';
import { LanguageClient } from 'vscode-languageclient';
import mermaid from 'mermaid';
import * as path from 'path';
import ts = require('typescript');

export function registerDiagramPreview(context: vscode.ExtensionContext, client: LanguageClient) {

	const aureliaViewDataPanelType = 'aureliaViewData';

	let previewUri = vscode.Uri.parse('aurelia-preview://authority/aurelia-preview');

	let provider = new TextDocumentContentProvider(client);
	let registration = vscode.workspace.registerTextDocumentContentProvider('aurelia-preview', provider);
	let isPanelVisible: boolean = false;
	let panel: vscode.WebviewPanel;

	vscode.workspace.onDidChangeTextDocument(
		e => {
			if (e.document === vscode.window.activeTextEditor.document) {
				const str = 'hii';
				console.log(str);
				panel.webview.postMessage({ command: 'refactor' });
			}
		},
		null,
	);

	function fillWebViewHtml(panel: vscode.WebviewPanel, classDiagram: string): string {
		const diagramPreviewScriptSrc = path.resolve(__dirname, './diagramScript.js')
		const scriptPathOnDisk1 = vscode.Uri.file(diagramPreviewScriptSrc);
		// And the uri we use to load this script in the webview
		const diagramPreviewScriptSrcUri = panel.webview.asWebviewUri(scriptPathOnDisk1);

		// /Users/hdn/Desktop/aurelia-lsp/node_modules/mermaid/dist/mermaid.core.js
		// const mermaidSrc = path.resolve(__dirname, '../../../../node_modules/mermaid/dist/mermaid.min.js')
		// const mermaidSrc = path.resolve(__dirname, '../../../../')
		// const mermaidSrc = path.resolve(__dirname, '../../../../../', 'client/src/webview/mermaid-lib.js');
		const mermaidSrc = path.resolve(__dirname, '../../../../../', 'client/src/webview/index.bundle.js');
		const sourceDirectory = ts.sys.getCurrentDirectory();
		console.log("TCL: registerDiagramPreview -> sourceDirectory", sourceDirectory)
		const scriptPathOnDisk = vscode.Uri.file(mermaidSrc);
		// And the uri we use to load this script in the webview
		const mermaidSrcUri = panel.webview.asWebviewUri(scriptPathOnDisk);

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		// /Users/hdn/Desktop/aurelia-lsp/client/src/webview/mermaid-lib.js

		// /Users/hdn/Desktop/aurelia-lsp/client/out/client/src/webview/diagramScript.js
		// /Users/hdn/Desktop/aurelia-lsp/client/out/client/src/webview/node_modules/mermaid/dist/mermaid.core.js

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
					<script nonce="${nonce}" src="${diagramPreviewScriptSrcUri}"></script>

					<script>
						const counter = document.getElementById('lines-of-code-counter');

						// Handle the message inside the webview
						window.addEventListener('message', event => {
								const message = event.data; // The JSON data our extension sent

								switch (message.command) {
										case 'refactor':
												count = Math.ceil(count * 0.5);
												counter.textContent = count;
												break;
								}
						});
					</script>
				</body>
      </html>
    `;
	}

	context.subscriptions.push(vscode.commands.registerCommand('aurelia.openClassMethodsHierarchy', async () => {
		const classDiagram = await client.sendRequest<any>('aurelia-class-diagram')

		// const smartAutocomplete = vscode.workspace.getConfiguration().get('aurelia.featureToggles.smartAutocomplete');
		// if (smartAutocomplete) {
		panel = vscode.window.createWebviewPanel(
			aureliaViewDataPanelType,
			'Aurelia view data',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
			}
		);

		panel.webview.html = fillWebViewHtml(panel, classDiagram);

		// provider.provideTextDocumentContent(previewUri)
		// 	.then(
		// 		(success) => {
		// 			panel.webview.html = fillWebViewHtml(success);
		// 		},
		// 		(reason) => {
		// 			vscode.window.showErrorMessage(reason);
		// 		});
		// } else {
		// 	return vscode.window.showWarningMessage('This command requires the experimental feature "smartAutocomplete" to be enabled');
		// }

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