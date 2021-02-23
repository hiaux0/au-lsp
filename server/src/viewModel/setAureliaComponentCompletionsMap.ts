import { AureliaProgram, IComponentCompletionsMap } from './AureliaProgram';
import * as ts from 'typescript';
import * as Path from 'path';
import {
  CompletionItem,
  MarkupKind,
  InsertTextFormat,
  CompletionItemKind,
} from 'vscode-languageserver';
import { kebabCase } from 'lodash';
// import { createDiagram } from "./createDiagram";
import { getElementNameFromClassDeclaration } from '../common/className';
import {
  AureliaClassTypes,
  AureliaDecorator,
  AureliaViewModel,
} from '../common/constants';

export function setAureliaComponentCompletionsMap(
  aureliaProgram: AureliaProgram
): void {
  console.log('[acm.ts] Starting Component Map collection');

  const paths = aureliaProgram.getProjectFilePaths();
  let targetClassDeclaration: ts.ClassDeclaration | undefined;
  let classDeclaration: CompletionItem | undefined;
  const classDeclarations: CompletionItem[] = [];
  let classMembers: CompletionItem[] = [];
  let bindables: CompletionItem[] = [];
  // let classDiagram: any;
  const componentCompletionsMap: IComponentCompletionsMap = {
    classDeclarations: [],
    classMembers: [],
    bindables: [],
  };

  const program = aureliaProgram.getProgram();
  if (program === undefined) {
    console.log('No Program associated with your Aurelia project.');
    return;
  }
  const checker = program.getTypeChecker();

  paths.forEach((path) => {
    const isDTs = Path.basename(path).endsWith('.d.ts');
    if (isDTs) return;

    const ext = Path.extname(path);

    switch (ext) {
      case '.js':
      case '.ts': {
        const sourceFile = program.getSourceFile(path);
        if (sourceFile === undefined) {
          console.log('Watcher program did not find file: ', path);
          return;
        }

        /* export class MyCustomElement */
        const result = getAureliaViewModelClassDeclaration(sourceFile, checker);
        classDeclaration = result?.classDeclaration;
        targetClassDeclaration = result?.targetClassDeclaration;

        if (
          classDeclaration === undefined ||
          targetClassDeclaration === undefined
        ) {
          console.log(
            '[acm.ts] No Aurelia Class Statement found for file: ',
            path
          );
          break;
        }
        classDeclarations.push(classDeclaration);

        // classDiagram = createDiagram(targetClassDeclaration!, checker);
        /* public myVariables: string; */
        const result1 = getAureliaViewModelClassMembers(
          targetClassDeclaration,
          checker
        );
        classMembers = result1.classMembers;
        bindables = result1.bindables;

        componentCompletionsMap.classDeclarations = classDeclarations;
        componentCompletionsMap?.classMembers?.push(...classMembers);
        componentCompletionsMap?.bindables?.push(...bindables);
        break;
      }
      case '.html': {
        break;
      }
      default: {
        console.log('Unsupported extension');
      }
    }
  });

  aureliaProgram.setComponentCompletionsMap(componentCompletionsMap);
  // aureliaProgram.setClassDiagram(classDiagram);
}

function getAureliaViewModelClassDeclaration(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
) {
  let result: CompletionItem | undefined;
  let targetClassDeclaration: ts.ClassDeclaration | undefined;
  let templateImportPath: string | undefined = '';

  sourceFile.forEachChild((node) => {
    if (
      ts.isClassDeclaration(node) &&
      isNodeExported(node) &&
      (classDeclarationHasUseViewOrNoView(node) ||
        hasCorrectNamingConvention(node))
      /** && hasTemplate */
    ) {
      // Save the class for further processing later on.
      targetClassDeclaration = node;
      targetClassDeclaration.name?.getText(); /* ? */

      templateImportPath = getTemplateImportPathFromCustomElementDecorator(
        targetClassDeclaration,
        sourceFile
      );

      const elementName = getElementNameFromClassDeclaration(node);
      // Note the `!` in the argument: `getSymbolAtLocation` expects a `Node` arg, but returns undefined
      const symbol = checker.getSymbolAtLocation(node.name!);
      if (symbol === undefined) {
        console.log('No symbol found for: ', node.name);
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
        data: { templateImportPath },
      };
    }
  });

  return {
    classDeclaration: result,
    targetClassDeclaration,
    templateImportPath,
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
export function classDeclarationHasUseViewOrNoView(
  classDeclaration: ts.ClassDeclaration
): boolean {
  if (!classDeclaration.decorators) return false;

  const hasViewDecorator = classDeclaration.decorators.some((decorator) => {
    const result =
      decorator.getText().includes('@useView') ||
      decorator.getText().includes('@noView');
    return result;
  });

  return hasViewDecorator;
}

/**
 * MyClassCustomelement
 *
 * \@customElement(...)
 * MyClass
 */
export function hasCorrectNamingConvention(
  classDeclaration: ts.ClassDeclaration
): boolean {
  if (!classDeclaration.decorators) return false;

  const hasViewDecorator = classDeclaration.decorators.some((decorator) => {
    const result = decorator
      .getText()
      .includes(AureliaDecorator.CUSTOM_ELEMENT);
    return result;
  });

  const hasCustomElementNamingConvention = Boolean(
    classDeclaration.name?.getText().includes(AureliaClassTypes.CUSTOM_ELEMENT)
  );

  return hasViewDecorator || hasCustomElementNamingConvention;
}

function getTemplateImportPathFromCustomElementDecorator(
  classDeclaration: ts.ClassDeclaration,
  sourceFile: ts.SourceFile
): string | undefined {
  if (!classDeclaration.decorators) return;

  const customElementDecorator = classDeclaration.decorators.find(
    (decorator) => {
      const result = decorator
        .getText()
        .includes(AureliaDecorator.CUSTOM_ELEMENT);
      return result;
    }
  );

  if (!customElementDecorator) return;

  const hasTemplateProp = customElementDecorator
    .getText()
    .includes(AureliaViewModel.TEMPLATE);
  if (!hasTemplateProp) return;

  let templateImportPath = '';
  const templateImport = sourceFile.statements.find((statement) => {
    const isImport = statement.kind === ts.SyntaxKind.ImportDeclaration;
    if (!isImport) {
      return false;
    }

    let foundTemplateImport = false;
    statement.getChildren().forEach((child) => {
      if (child.kind === ts.SyntaxKind.ImportClause) {
        if (child.getText().includes(AureliaViewModel.TEMPLATE)) {
          foundTemplateImport = true;
        }
      }
    });

    return foundTemplateImport;
  });

  templateImport?.getChildren().forEach((child) => {
    if (child.kind === ts.SyntaxKind.StringLiteral) {
      templateImportPath = child.getText().replace(/['"]/g, '');
    }
  });

  templateImportPath = Path.resolve(
    Path.dirname(sourceFile.fileName),
    templateImportPath
  );

  return templateImportPath;
}

/**
 *
 */
function getAureliaViewModelClassMembers(
  classDeclaration: ts.ClassDeclaration,
  checker: ts.TypeChecker
) {
  const elementName = getElementNameFromClassDeclaration(classDeclaration);
  const classMembers: CompletionItem[] = [];
  const bindables: CompletionItem[] = [];

  classDeclaration.forEachChild((classMember) => {
    if (
      ts.isPropertyDeclaration(classMember) ||
      ts.isMethodDeclaration(classMember)
    ) {
      const classMemberName = classMember.name?.getText();

      const isBindable = classMember.decorators?.find((decorator) => {
        return decorator.getText().includes('@bindable');
      });

      // Get bindable type. If bindable type is undefined, we set it to be "unknown".
      const memberType =
        classMember.type?.getText() !== undefined
          ? classMember.type?.getText()
          : 'unknown';
      const memberTypeText =
        '' + `${isBindable ? 'Bindable ' : ''}` + `Type: \`${memberType}\``;
      // Add comment documentation if available
      const symbol = checker.getSymbolAtLocation(classMember.name);
      const commentDoc = ts.displayPartsToString(
        symbol?.getDocumentationComment(checker)
      );

      let defaultValueText: string = '';
      if (ts.isPropertyDeclaration(classMember)) {
        // Add default values. The value can be undefined, but that is correct in most cases.
        const defaultValue = classMember.initializer?.getText() ?? '';
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
          '' +
          `(Au ${isBindable ? 'Bindable' : 'Class member'}) ` +
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
