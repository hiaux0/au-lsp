import { singleton, Container } from "aurelia-dependency-injection";
import * as ts from "typescript";
import * as Path from "path";
import { CompletionItem } from "vscode-languageserver";
import { AureliaClassTypes } from "../common/constants";
const globalContainer = new Container();

interface IWebcomponent {}

export interface IComponentMap {
  classDeclarations: CompletionItem[] | undefined;
  classMembers: CompletionItem[] | undefined;
  bindables: CompletionItem[] | undefined;
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
   * @customElement(">component-name<")
   * export class >ComponentName< {} --> component-name
   * */
  viewModelName?: string;
  viewFileName?: string;
  type: AureliaClassTypes;
}

interface IClassDiagram {}

/**
 * The AureliaProgram class represents your whole applicaton
 * (aka. program in typescript terminology)
 */
@singleton()
export class AureliaProgram {
  public components: IWebcomponent[] = [];
  public builderProgram: ts.SemanticDiagnosticsBuilderProgram | undefined;
  public componentMap: IComponentMap;
  // public classDiagram: IClassDiagram;
  public aureliaSourceFiles?: ts.SourceFile[];
  componentList: IComponentList[];

  public setComponentMap(componentMap: IComponentMap) {
    this.componentMap = componentMap;
  }

  public getComponentMap() {
    return this.componentMap;
  }

  public setComponentList(componentList: IComponentList[]) {
    this.componentList = componentList;
  }

  public getComponentList() {
    return this.componentList;
  }

  // public setClassDiagram(classDiagram: IClassDiagram) {
  //   this.classDiagram = classDiagram;
  // }

  // public getClassDiagram() {
  //   return this.classDiagram;
  // }

  public getProjectFiles(sourceDirectory?: string) {
    sourceDirectory = sourceDirectory || ts.sys.getCurrentDirectory();
    const paths = ts.sys.readDirectory(
      sourceDirectory,
      ["ts", "js", "html"],
      ["node_modules", "aurelia_project"],
      ["src"]
    );
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
      if (sourceFile.fileName.includes("node_modules")) return;
      return sourceFile;
    });
  }

  /**
   * Get aurelia source files
   */
  public getAureliaSourceFiles() {
    console.log(
      "TCL: AureliaProgram -> getAureliaSourceFiles -> getAureliaSourceFiles"
    );
    if (this.aureliaSourceFiles) return this.aureliaSourceFiles;

    this.updateAureliaSourceFiles(this.builderProgram);
    return this.aureliaSourceFiles;
  }
}

export const aureliaProgram = globalContainer.get(AureliaProgram);
