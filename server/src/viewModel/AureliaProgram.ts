import { singleton, inject, autoinject } from 'aurelia-dependency-injection';
import * as ts from 'typescript';
import { CompletionItem } from 'vscode-languageserver';
import { DocumentSettings } from '../configuration/DocumentSettings';

interface IWebcomponent {

}

export interface IComponentMap {
	classStatements: CompletionItem[] | undefined
}

/**
 * The AureliaProgram class represents your whole applicaton
 * (aka. program in typescript terminology)
 */
@singleton()
@inject(DocumentSettings)
export class AureliaProgram {
	public components: IWebcomponent[] = [];
	public watcherProgram: ts.SemanticDiagnosticsBuilderProgram | undefined;
	public documentSettings: DocumentSettings;

	private componentMap: IComponentMap;

	constructor(documentSettings: DocumentSettings) {
		this.documentSettings = documentSettings;
	}

	public setComponentMap(componentMap: IComponentMap) {
		this.componentMap = componentMap;
	}

	public getComponentMap() {
		return this.componentMap
	}

	public getProjectFiles(sourceDirectory?: string) {
		this.documentSettings
		sourceDirectory = sourceDirectory || ts.sys.getCurrentDirectory();
		// const paths = ts.sys.readDirectory(sourceDirectory, ['ts', 'js', 'html'], ['node_modules', 'aurelia_project'], ['src']);
		const paths = ts.sys.readDirectory(sourceDirectory, ['ts', 'js', 'html'], ['node_modules', 'aurelia_project'], ['src']);
		return paths;
	}


  /**
   * getProgram gets the current program
   *
   * The program may be undefined if no watcher is present or no program has been initiated yet.
   *
   * This program can change from each call as the program is fetched
   * from the watcher which will listen to IO changes in the tsconfig.
   */
	public getProgram(): ts.Program | undefined {
		if (this.watcherProgram !== undefined) {
			return this.watcherProgram.getProgram();
		} else {
			return undefined;
		}
	}
}
