import { TextDocument, Diagnostic, DiagnosticSeverity, Connection } from 'vscode-languageserver';
import { inject } from 'aurelia-dependency-injection';
import { DocumentSettings, ExampleSettings } from '../configuration/DocumentSettings';

@inject(DocumentSettings)
export class TextDocumentChange {
	public connection!: Connection; // !

	public hasDiagnosticRelatedInformationCapability: boolean = false;

	public settings!: ExampleSettings; // !

	constructor(private readonly DocumentSettingsClass: DocumentSettings) { }

	inject(connection: Connection, hasDiagnosticRelatedInformationCapability: boolean) {
		// inject(settings: any, connection: Connection, hasDiagnosticRelatedInformationCapability: boolean) {
		this.connection = connection;
		this.hasDiagnosticRelatedInformationCapability = hasDiagnosticRelatedInformationCapability;
	}

	async validateTextDocument(textDocument: TextDocument): Promise<void> {
		// In this simple example we get the settings for every validate run.
		const settings = await this.DocumentSettingsClass.getDocumentSettings(textDocument.uri);

		// The validator creates diagnostics for all uppercase words length 2 and more
		let text = textDocument.getText();
		let pattern = /\b[A-Z]{2,}\b/g;
		let m: RegExpExecArray | null;

		let problems = 0;
		let diagnostics: Diagnostic[] = [];
		while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
			problems++;
			let diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				range: {
					start: textDocument.positionAt(m.index),
					end: textDocument.positionAt(m.index + m[0].length)
				},
				message: `${m[0]} is all uppercase.`,
				source: 'ex'
			};
			if (this.hasDiagnosticRelatedInformationCapability) {
				diagnostic.relatedInformation = [
					{
						location: {
							uri: textDocument.uri,
							range: Object.assign({}, diagnostic.range)
						},
						message: 'Spelling matters'
					},
					{
						location: {
							uri: textDocument.uri,
							range: Object.assign({}, diagnostic.range)
						},
						message: 'Particularly for names'
					}
				];
			}
			diagnostics.push(diagnostic);
		}

		// Send the computed diagnostics to VSCode.
		this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	}

}