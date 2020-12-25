import { AureliaProgram, IComponentMap } from "./AureliaProgram";
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
import { getElementNameFromClassDeclaration } from "../common/className";

export function setAureliaComponentMap(
  aureliaProgram: AureliaProgram,
  sourceDirectory?: string
) {
  const paths = aureliaProgram.getProjectFiles(sourceDirectory);
  let targetClassDeclaration: ts.ClassDeclaration | undefined;
  let classDeclaration: CompletionItem | undefined;
  let classDeclarations: CompletionItem[] = [];
  let classMembers: CompletionItem[] = [];
  let bindables: CompletionItem[] = [];
  let classDiagram: any;
  let componentMap: IComponentMap = {
    classDeclarations: [],
    classMembers: [],
    bindables: [],
  };

  const program = aureliaProgram.getProgram();
  if (program === undefined) {
    console.log("No Program associated with your Aurelia project.");
    return;
  }
  const checker = program.getTypeChecker();

  paths.forEach(async (path) => {
    const ext = Path.extname(path);
    ext;
    switch (ext) {
      case ".js":
      case ".ts": {
        const sourceFile = program.getSourceFile(path);
        if (sourceFile === undefined) {
          console.log("Watcher program did not find file: ", path);
          return;
        }

        /* export class MyCustomElement */
        const result = getAureliaViewModelClassDeclaration(
          sourceFile!,
          checker
        );
        classDeclaration = result?.classDeclaration;
        targetClassDeclaration = result?.targetClassDeclaration;

        if (
          classDeclaration === undefined ||
          targetClassDeclaration === undefined
        ) {
          console.log("No Class statement found.");
          break;
        }
        classDeclarations.push(classDeclaration);

        classDiagram = createDiagram(targetClassDeclaration!, checker);
        /* public myVariables: string; */
        const result1 = getAureliaViewModelClassMembers(
          targetClassDeclaration!,
          checker
        );
        classMembers = result1.classMembers;
        bindables = result1.bindables;

        componentMap.classDeclarations = classDeclarations;
        componentMap?.classMembers?.push(...classMembers);
        componentMap?.bindables?.push(...bindables);
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

  aureliaProgram.setComponentMap(componentMap!);
  aureliaProgram.setClassDiagram(classDiagram);
}

function getAureliaViewModelClassDeclaration(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
) {
  // if (sourceFile?.fileName !== '/Users/hdn/Desktop/aurelia-lsp/client/testFixture/src/my-compo/my-compo.ts') return;
  let result: CompletionItem | undefined;
  let targetClassDeclaration: ts.ClassDeclaration | undefined;

  sourceFile.forEachChild((node) => {
    const asht = ts.isClassDeclaration(node);
    let qdrw;
    if (ts.isClassDeclaration(node)) {
      qdrw = isNodeExported(node);
    }
    if (
      ts.isClassDeclaration(node) &&
      isNodeExported(node)
      /** && hasTemplate
       * && classDeclarationHasUseViewOrNoView
       * && hasCorrectNamingConvention */
    ) {
      // Save the class for further processing later on.
      targetClassDeclaration = node;

      const elementName = getElementNameFromClassDeclaration(node);
      // Note the `!` in the argument: `getSymbolAtLocation` expects a `Node` arg, but returns undefined
      const symbol = checker.getSymbolAtLocation(node.name!);
      if (symbol === undefined) {
        console.log("No symbol found for: ", node.name);
        return;
      }
      const documentation = ts.displayPartsToString(
        symbol.getDocumentationComment(checker)
      );

      result = {
        documentation: {
          kind: MarkupKind.Markdown,
          value: documentation,
        },
        detail: `${elementName}`,
        insertText: `${elementName}$2>$1</${elementName}>$0`,
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Class,
        label: `(Au Class) ${elementName}`,
      };
    }
  });

  return {
    classDeclaration: result,
    targetClassDeclaration,
  };
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
 *
 */
function getAureliaViewModelClassMembers(
  classDeclaration: ts.ClassDeclaration,
  checker: ts.TypeChecker
) {
  const elementName = getElementNameFromClassDeclaration(classDeclaration);
  let classMembers: CompletionItem[] = [];
  let bindables: CompletionItem[] = [];

  classDeclaration.forEachChild((classMember) => {
    ts;
    if (
      ts.isPropertyDeclaration(classMember) ||
      ts.isMethodDeclaration(classMember)
    ) {
      const classMemberName = classMember.name?.getText();

      const isBindable = classMember.decorators?.find((decorator) => {
        return decorator.getText().includes("@bindable");
      });

      // Get bindable type. If bindable type is undefined, we set it to be "unknown".
      const memberType =
        classMember.type?.getText() !== undefined
          ? classMember.type?.getText()
          : "unknown";
      const memberTypeText =
        "" + `${isBindable ? "Bindable " : ""}` + `Type: \`${memberType}\``;
      // Add comment documentation if available
      const symbol = checker.getSymbolAtLocation(classMember.name);
      const commentDoc = ts.displayPartsToString(
        symbol?.getDocumentationComment(checker)
      );

      let defaultValueText: string = "";
      if (ts.isPropertyDeclaration(classMember)) {
        // Add default values. The value can be undefined, but that is correct in most cases.
        const defaultValue = classMember.initializer?.getText();
        defaultValueText = `Default value: \`${defaultValue}\``;
      }

      // Concatenate documentation parts with spacing
      const documentation = `${commentDoc}\n\n${memberTypeText}\n\n${defaultValueText}`;

      const kind: CompletionItemKind = ts.isPropertyDeclaration(classMember)
        ? CompletionItemKind.Field
        : CompletionItemKind.Method;

      // const quote = this.settings.quote;
      const quote = '"';
      const varAsKebabCase = kebabCase(classMemberName);
      const result: CompletionItem = {
        documentation: {
          kind: MarkupKind.Markdown,
          value: documentation,
        },
        detail: `${isBindable ? classMemberName : varAsKebabCase}`,
        insertText: isBindable
          ? `${varAsKebabCase}.$\{1:bind}=${quote}$\{0:${classMemberName}}${quote}`
          : classMemberName,
        insertTextFormat: InsertTextFormat.Snippet,
        kind,
        label:
          "" +
          `(Au ${isBindable ? "Bindable" : "Class member"}) ` +
          `${isBindable ? varAsKebabCase : classMemberName}`,
        data: {
          elementName,
        },
      };

      if (isBindable) {
        bindables.push(result);
      } else {
        classMembers.push(result);
      }
    }
  });
  return {
    classMembers,
    bindables,
  };
}
