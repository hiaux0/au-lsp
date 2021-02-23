export interface AureliaClassDecorators {
  customElement: string;
  useView: string;
  noView: string;
}

type AureliaClassDecoratorPossibilites =
  | 'customElement'
  | 'useView'
  | 'noView'
  | '';

interface DecoratorInfo {
  decoratorName: AureliaClassDecoratorPossibilites;
  decoratorArgument: string;
}

import {
  AureliaProgram,
  IComponentList,
} from './AureliaProgram';
import * as ts from 'typescript';
import * as Path from 'path';
import { getElementNameFromClassDeclaration } from '../common/className';
import { AureliaClassTypes, VALUE_CONVERTER_SUFFIX } from '../common/constants';
import { IProjectOptions } from '../common/common.types';

export function getAureliaComponentList(
  aureliaProgram: AureliaProgram,
  projectOptions?: IProjectOptions
): IComponentList[] | undefined {
  const paths = aureliaProgram.setProjectFilePaths(projectOptions);
  const componentList: IComponentList[] = [];

  const program = aureliaProgram.getProgram();
  if (program === undefined) {
    console.log('No Program associated with your Aurelia project.');
    return;
  }
  const checker = program.getTypeChecker();

  paths.forEach((path) => {
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
        const componentInfo = getAureliaComponentInfoFromClassDeclaration(
          sourceFile,
          checker
        );

        if (componentInfo) {
          componentList.push(componentInfo);
        }

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

  if (componentList.length === 0) {
    console.log('Error: No Aurelia class found');
  }

  return componentList;
}

function getAureliaComponentInfoFromClassDeclaration(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): IComponentList | undefined {
  let result: IComponentList | undefined;
  let targetClassDeclaration: ts.ClassDeclaration | undefined;

  sourceFile.forEachChild((node) => {
    if (
      ts.isClassDeclaration(node) &&
      isNodeExported(node)
      /** && hasTemplate
       * && classDeclarationHasUseViewOrNoView
       * && hasCorrectNamingConvention */
    ) {
      targetClassDeclaration = node;

      const isValueConverterModel = checkValueConverter(targetClassDeclaration);
      if (isValueConverterModel) {
        const valueConverterName = targetClassDeclaration.name
          ?.getText()
          .replace(VALUE_CONVERTER_SUFFIX, '')
          .toLocaleLowerCase();
        result = {
          className: targetClassDeclaration.name?.getText() ?? '',
          valueConverterName,
          baseFileName: Path.parse(sourceFile.fileName).name,
          filePath: sourceFile.fileName,
          type: AureliaClassTypes.VALUE_CONVERTER,
          sourceFile,
        };
        return;
      }

      const viewModelName = getElementNameFromClassDeclaration(
        targetClassDeclaration
      );

      // Note the `!` in the argument: `getSymbolAtLocation` expects a `Node` arg, but returns undefined
      const symbol = checker.getSymbolAtLocation(node.name!);
      if (symbol === undefined) {
        console.log('No symbol found for: ', node.name);
        return;
      }

      result = {
        className: targetClassDeclaration.name?.getText() ?? '',
        viewModelName,
        baseFileName: Path.parse(sourceFile.fileName).name,
        filePath: sourceFile.fileName,
        viewFileName: 'TODO',
        type: AureliaClassTypes.CUSTOM_ELEMENT,
        sourceFile,
      };
    }
  });

  return result;
}

function checkValueConverter(targetClassDeclaration: ts.ClassDeclaration) {
  const isValueConverterName = targetClassDeclaration.name
    ?.getText()
    .includes(VALUE_CONVERTER_SUFFIX);

  return Boolean(isValueConverterName);
}

function isNodeExported(node: ts.ClassDeclaration): boolean {
  return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
}

export function getClassDecoratorInfos(
  classDeclaration: ts.ClassDeclaration
): DecoratorInfo[] {
  const classDecoratorInfos: DecoratorInfo[] = [];

  const aureliaDecorators = ['customElement', 'useView', 'noView'];
  classDeclaration.decorators?.forEach((decorator) => {
    const result: DecoratorInfo = {
      decoratorName: '',
      decoratorArgument: '',
    };

    decorator.expression.forEachChild((decoratorChild) => {
      const childName = decoratorChild.getText() as AureliaClassDecoratorPossibilites;
      const isAureliaDecorator = aureliaDecorators.includes(childName);

      if (isAureliaDecorator) {
        if (ts.isIdentifier(decoratorChild)) {
          result.decoratorName = childName;
        }
      } else if (ts.isToken(decoratorChild)) {
        result.decoratorArgument = childName;
      }
    });
    classDecoratorInfos.push(result);
  });

  return classDecoratorInfos.filter((info) => info.decoratorName !== '');
}
