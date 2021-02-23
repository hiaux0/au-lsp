import { singleton, Container } from 'aurelia-dependency-injection';
import * as ts from 'typescript';
import { CompletionItem } from 'vscode-languageserver';
import { defaultProjectOptions, IProjectOptions } from '../common/common.types';
import { AureliaClassTypes } from '../common/constants';
import { ViewRegionInfo } from '../feature/embeddedLanguages/embeddedSupport';
const globalContainer = new Container();

interface IWebcomponent {}

export interface IComponentCompletionsMap {
  classDeclarations: CompletionItem[] | undefined;

  /** in kebab-case */
  componentName?: string;

  // View Model
  viewModelFilePath?: string;
  sourceFile?: ts.SourceFile;
  /** Used for Completions in own View */
  classMembers?: CompletionItem[] | undefined;
  /** Used for Completions in other View */
  bindables?: CompletionItem[] | undefined;

  // View
  viewFilePath?: string;
  regions?: ViewRegionInfo[];
}

export interface IComponentList {
  sourceFile?: ts.SourceFile;
  /** export class >ComponentName< {} */
  className: string;
  /** component-name.ts */
  baseFileName: string;
  /** path/to/component-name.ts */
  filePath: string;
  /**
   * export class >Sort<ValueConverter {} --> sort
   * */
  valueConverterName?: string;
  /**
   * \@customElement(">component-name<")
   * export class >ComponentName< {} --> component-name
   * */
  viewModelName?: string;
  viewFileName?: string;
  type: AureliaClassTypes;
}

// interface IClassDiagram {}

/**
 * The AureliaProgram class represents your whole applicaton
 * (aka. program in typescript terminology)
 */
@singleton()
export class AureliaProgram {
  public builderProgram: ts.SemanticDiagnosticsBuilderProgram | undefined;
  public componentCompletionsMap: IComponentCompletionsMap;
  // public classDiagram: IClassDiagram;
  public aureliaSourceFiles?: ts.SourceFile[];
  public projectFilePaths: string[];
  private componentList: IComponentList[];

  public setComponentCompletionsMap(
    componentCompletionsMap: IComponentCompletionsMap
  ): void {
    this.componentCompletionsMap = componentCompletionsMap;
  }

  public getComponentCompletionsMap(): IComponentCompletionsMap {
    return this.componentCompletionsMap;
  }

  public setComponentList(componentList: IComponentList[]): void {
    this.componentList = componentList;
  }

  public getComponentList(): IComponentList[] {
    return this.componentList;
  }

  // public setClassDiagram(classDiagram: IClassDiagram) {
  //   this.classDiagram = classDiagram;
  // }

  // public getClassDiagram() {
  //   return this.classDiagram;
  // }

  public getProjectFiles(
    options: IProjectOptions = defaultProjectOptions
  ): string[] {
    const { sourceDirectory, exclude, include } = options;
    const targetSourceDirectory =
      sourceDirectory ?? ts.sys.getCurrentDirectory();

    const finalExcludes = [
      '**/node_modules',
      'aurelia_project',
      '**/out',
      '**/build',
      '**/dist',
    ];
    if (exclude !== undefined) {
      finalExcludes.push(...exclude);
    }

    let finalIncludes: string[];

    if (include !== undefined) {
      finalIncludes = include;
    } else {
      finalIncludes = ['src'];
    }

    const paths = ts.sys.readDirectory(
      targetSourceDirectory,
      ['ts', 'js', 'html'],
      finalExcludes,
      finalIncludes
    );

    this.projectFilePaths = paths;
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
    if (this.builderProgram !== undefined) {
      const program = this.builderProgram.getProgram();
      return program;
    } else {
      return undefined;
    }
  }

  public setBuilderProgram(
    builderProgram: ts.SemanticDiagnosticsBuilderProgram
  ): void {
    this.builderProgram = builderProgram;
    this.updateAureliaSourceFiles(this.builderProgram);
  }

  /**
   * Only update aurelia source files with relevant source files
   */
  public updateAureliaSourceFiles(
    builderProgram?: ts.SemanticDiagnosticsBuilderProgram
  ): void {
    const sourceFiles = builderProgram?.getSourceFiles();
    this.aureliaSourceFiles = sourceFiles?.filter((sourceFile) => {
      if (sourceFile.fileName.includes('node_modules')) return false;
      return sourceFile;
    });
  }

  /**
   * Get aurelia source files
   */
  public getAureliaSourceFiles(): ts.SourceFile[] | undefined {
    if (this.aureliaSourceFiles) return this.aureliaSourceFiles;

    this.updateAureliaSourceFiles(this.builderProgram);
    return this.aureliaSourceFiles;
  }
}

export const aureliaProgram = globalContainer.get(AureliaProgram);
