import { Connection } from 'vscode-languageserver';

// The example settings
export interface ExampleSettings {
	maxNumberOfProblems: number;
}

export class DocumentSettings {
	// The global settings, used when the `workspace/configuration` request is not supported by the client.
	// Please note that this is not the case when using this server with the client provided in this example
	// but could happen with other clients.
	public defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
	public globalSettings: ExampleSettings;

	// Cache the settings of all open documents
	public settingsMap: Map<string, Thenable<ExampleSettings>> = new Map();

	public connection!: Connection; // !

	public hasConfigurationCapability: boolean = false;

	constructor() {
		this.globalSettings = this.defaultSettings;
	}

	inject(connection: Connection, hasConfigurationCapability: boolean) {
		this.connection = connection;
		this.hasConfigurationCapability = hasConfigurationCapability;
	}

	getDocumentSettings(resource: string): Thenable<ExampleSettings> {
		if (!this.hasConfigurationCapability) {
			return Promise.resolve(this.globalSettings);
		}
		let result = this.settingsMap.get(resource);
		if (!result) {
			result = this.connection.workspace.getConfiguration({
				scopeUri: resource,
				section: 'languageServerExample'
			});
			this.settingsMap.set(resource, result);
		}
		return result;
	}

}