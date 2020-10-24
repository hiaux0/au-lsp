import {
  AureliaProgram,
  IComponentList,
  IComponentMap,
} from "./AureliaProgram";
import * as ts from "typescript";
import * as Path from "path";
import {
  CompletionItem,
  MarkupKind,
  InsertTextFormat,
  CompletionItemKind,
} from "vscode-languageserver";
import { kebabCase } from "@aurelia/kernel";
import { createDiagram } from "./createDiagram";

export function getAureliaComponentList(
  aureliaProgram: AureliaProgram,
  sourceDirectory?: string
) {
  const paths = aureliaProgram.getProjectFiles(sourceDirectory);
  let targetClassDeclaration: ts.ClassDeclaration | undefined;
  let classDeclaration: CompletionItem | undefined;
  let classDeclarations: CompletionItem[] = [];
  let classMembers: CompletionItem[] = [];
  let bindables: CompletionItem[] = [];
  let componentMap: IComponentMap = {
    classDeclarations: [],
    classMembers: [],
    bindables: [],
  };
  let componentList: IComponentList[] = [];

  const program = aureliaProgram.getProgram();
  if (program === undefined) {
    console.log("No Program associated with your Aurelia project.");
    return;
  }
  const checker = program.getTypeChecker();

  paths.forEach(async (path) => {
    const ext = Path.extname(path);
    switch (ext) {
      case ".js":
      case ".ts": {
        const sourceFile = program.getSourceFile(path);
        if (sourceFile === undefined) {
          console.log("Watcher program did not find file: ", path);
          return;
        }

        /* export class MyCustomElement */
        const componentList = getAureliaComponentInfoFromClassDeclaration(
          sourceFile!,
          checker
        );

        break;
      }
      case ".html": {
        break;
      }
      default: {
        console.log("Unsupported extension");
      }
    }
  });

  aureliaProgram.setComponentList(componentList);
}

function getAureliaComponentInfoFromClassDeclaration(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): IComponentList[] {
  // if (sourceFile?.fileName !== '/Users/hdn/Desktop/aurelia-lsp/client/testFixture/src/my-compo/my-compo.ts') return;
  let result: IComponentList;
  let componentList: IComponentList[] = [];
  let targetClassDeclaration: ts.ClassDeclaration | undefined;

  sourceFile.forEachChild((node) => {
    if (
      ts.isClassDeclaration(node) &&
      isNodeExported(node)
      /** && hasTemplate
       * && classDeclarationHasUseViewOrNoView
       * && hasCorrectNamingConvention */
    ) {
      // Save the class for further processing later on.
      targetClassDeclaration = node;

      // const viewModelName = targetClassDeclaration.name?.getText() || '';

      const elementName = getElementNameFromClassDeclaration(node);
      // Note the `!` in the argument: `getSymbolAtLocation` expects a `Node` arg, but returns undefined
      const symbol = checker.getSymbolAtLocation(node.name!);
      if (symbol === undefined) {
        console.log("No symbol found for: ", node.name);
        return;
      }

      result = {
        viewModelName: targetClassDeclaration.name?.getText() || "",
        baseFileName: Path.basename(sourceFile.fileName),
        view: "TODO",
      };
      componentList.push(result);
    }
  });

  return componentList;
}

function isNodeExported(node: ts.ClassDeclaration): boolean {
  return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
}

/**
 * classDeclarationHasUseViewOrNoView checks whether a classDeclaration has a useView or noView
 *
 * @param classDeclaration - ClassDeclaration to check
 */
function classDeclarationHasUseViewOrNoView(
  classDeclaration: ts.ClassDeclaration
): boolean | undefined {
  return classDeclaration.decorators?.some((decorator) => {
    return (
      decorator.getText().includes("@useView") ||
      decorator.getText().includes("@noView")
    );
  });
}

/**
 * Fetches the equivalent component name based on the given class declaration
 *
 * @param sourceFile - The class declaration to map a component name from
 */
function getElementNameFromClassDeclaration(
  classDeclaration: ts.ClassDeclaration
): string {
  return kebabCase(classDeclaration.name?.getText()!);
}
