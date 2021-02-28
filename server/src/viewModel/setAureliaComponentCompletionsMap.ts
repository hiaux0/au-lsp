import * as ts from 'typescript';
import * as Path from 'path';
import {
  AureliaClassTypes,
  AureliaDecorator,
  AureliaViewModel,
} from '../common/constants';

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
export function hasCustomElementNamingConvention(
  classDeclaration: ts.ClassDeclaration
): boolean {
  const hasCustomElementDecorator =
    classDeclaration.decorators?.some((decorator) => {
      const result = decorator
        .getText()
        .includes(AureliaDecorator.CUSTOM_ELEMENT);
      return result;
    }) ?? false;

  const hasCustomElementNamingConvention = Boolean(
    classDeclaration.name?.getText().includes(AureliaClassTypes.CUSTOM_ELEMENT)
  );

  return hasCustomElementDecorator || hasCustomElementNamingConvention;
}

/**
 * MyClassValueConverter
 *
 * \@valueConverter(...)
 * MyClass
 */
export function hasValueConverterNamingConvention(
  classDeclaration: ts.ClassDeclaration
): boolean {
  const hasValueConverterDecorator =
    classDeclaration.decorators?.some((decorator) => {
      const result = decorator
        .getText()
        .includes(AureliaDecorator.VALUE_CONVERTER);
      return result;
    }) ?? false;

  const hasValueConverterNamingConvention = Boolean(
    classDeclaration.name?.getText().includes(AureliaClassTypes.VALUE_CONVERTER)
  );

  return hasValueConverterDecorator || hasValueConverterNamingConvention;
}

export function getTemplateImportPathFromCustomElementDecorator(
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
