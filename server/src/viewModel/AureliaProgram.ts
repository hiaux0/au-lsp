import { singleton, inject, autoinject, Container } from 'aurelia-dependency-injection';
import * as ts from 'typescript';
import { CompletionItem } from 'vscode-languageserver';
import { DocumentSettings } from '../configuration/DocumentSettings';
const globalContainer = new Container();

interface IWebcomponent {

}

export interface IComponentMap {
	classDeclarations: CompletionItem[] | undefined
	classMembers: CompletionItem[] | undefined
	bindables: CompletionItem[] | undefined
}

interface IClassDiagram {

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
	public componentMap: IComponentMap;
	public classDiagram: IClassDiagram;
	public aureliaSourceFiles?: ts.SourceFile[];

	constructor(documentSettings: DocumentSettings) {
		this.documentSettings = documentSettings;
	}

	public setComponentMap(componentMap: IComponentMap) {
		this.componentMap = componentMap;
	}

	public getComponentMap() {
		return this.componentMap
	}

	public setClassDiagram(classDiagram: IClassDiagram) {
		this.classDiagram = classDiagram;
	}

	public getClassDiagram() {
		return this.classDiagram
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

	public setProgram(program: ts.SemanticDiagnosticsBuilderProgram): void {
		this.watcherProgram = program;
	}

	/**
	 * Only get relevant aurelia source files from the program.
	 */
	public getAureliaSourceFiles() {
		if (this.aureliaSourceFiles) return this.aureliaSourceFiles;

		const sourceFiles = this.watcherProgram?.getSourceFiles();
		this.aureliaSourceFiles = sourceFiles?.filter(sourceFile => {
			if (sourceFile.fileName.includes('node_modules')) return
			return sourceFile;
		});
		return this.aureliaSourceFiles;
	}
}

export const aureliaProgram = globalContainer.get(AureliaProgram);