import { AureliaProgram, IComponentMap } from './AureliaProgram';
import * as ts from 'typescript';
import * as Path from 'path';
import { CompletionItem, MarkupKind, InsertTextFormat, CompletionItemKind } from 'vscode-languageserver';
import { kebabCase } from '@aurelia/kernel';

export function getAureliaComponentMap(aureliaProgram: AureliaProgram, sourceDirectory?: string) {
	const paths = aureliaProgram.getProjectFiles(sourceDirectory);
	let targetClassDeclaration: ts.ClassDeclaration | undefined;
	let classStatement: CompletionItem | undefined;
	let classMember: CompletionItem | undefined;
	let classStatements: CompletionItem[] = [];
	let classMembers: CompletionItem[] = [];

	const program = aureliaProgram.getProgram()
	if (program === undefined) {
		console.log('No Program associated with your Aurelia project.')
		return;
	}
	const checker = program.getTypeChecker();

	paths.forEach(async path => {
		const ext = Path.extname(path);
		ext
		switch (ext) {
			case '.js':
			case '.ts': {
				const sourceFile = program.getSourceFile(path)
				if (sourceFile === undefined) {
					console.log('Watcher program did not find file: ', path)
				}

				/* export class MyCustomElement */
				const result = getAureliaViewModelClassStatement(sourceFile!, checker);
				classStatement = result?.classStatement
				targetClassDeclaration = result?.targetClassDeclaration

				if (classStatement === undefined || targetClassDeclaration === undefined) {
					console.log('No Class statement found.')
					break;
				}
				classStatements.push(classStatement);

				/* public myVariables: string; */
				classMembers = getAureliaViewModelClassMembers(targetClassDeclaration!, checker);

				break;
			}
			case '.html': {
				break
			}
			default: {
				console.log('Unsupported extension')
			}
		}
	});

	let result: IComponentMap = {
		classStatements,
		classMembers,
	}
	aureliaProgram.setComponentMap(result);
}

function getAureliaViewModelClassStatement(sourceFile: ts.SourceFile, checker: ts.TypeChecker) {
	if (sourceFile.fileName !== '/Users/hdn/Desktop/aurelia-lsp/client/testFixture/src/my-compo/my-compo.ts') return;
	let result: CompletionItem | undefined;
	let targetClassDeclaration: ts.ClassDeclaration | undefined;

	sourceFile.forEachChild(node => {
		const asht = ts.isClassDeclaration(node)
		let qdrw;
		if (ts.isClassDeclaration(node)) {
			qdrw = isNodeExported(node);
		}
		if (ts.isClassDeclaration(node) &&
			isNodeExported(node)
			/** && hasTemplate
			 * && classDeclarationHasUseViewOrNoView
			 * && hasCorrectNamingConvention */) {

			// Save the class for further processing later on.
			targetClassDeclaration = node;

			const elementName = getElementNameFromClassDeclaration(node);
			// Note the `!` in the argument: `getSymbolAtLocation` expects a `Node` arg, but returns undefined
			const symbol = checker.getSymbolAtLocation(node.name!);
			if (symbol === undefined) {
				console.log('No symbol found for: ', node.name)
				return;
			}
			const documentation = ts.displayPartsToString(
				symbol.getDocumentationComment(checker));

			result = {
				documentation: {
					kind: MarkupKind.Markdown,
					value: documentation,
				},
				detail: `${elementName}`,
				insertText: `${elementName}$2>$1</${elementName}>$0`,
				insertTextFormat: InsertTextFormat.Snippet,
				kind: CompletionItemKind.Class,
				label: `${elementName} (Au Custom Element)`,
			};
		}
	});

	return {
		classStatement: result,
		targetClassDeclaration
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
function classDeclarationHasUseViewOrNoView(classDeclaration: ts.ClassDeclaration): boolean | undefined {
	return classDeclaration.decorators?.some(decorator => {
		return decorator.getText().includes("@useView") || decorator.getText().includes("@noView");
	});
}

/**
 * Fetches the equivalent component name based on the given class declaration
 *
 * @param sourceFile - The class declaration to map a component name from
 */
function getElementNameFromClassDeclaration(classDeclaration: ts.ClassDeclaration): string {
	return kebabCase(classDeclaration.name?.getText()!);
}

function getAureliaViewModelClassMembers(classDeclaration: ts.ClassDeclaration, checker: ts.TypeChecker) {
	let classMembers: CompletionItem[] = [];
	classDeclaration.forEachChild(classMember => {
		ts
		if (ts.isPropertyDeclaration(classMember)) {
			const classMemberName = classMember.name?.getText();

			// Get bindable type. If bindable type is undefined, we set it to be "unknown".
			const bindableType = classMember.type?.getText() !== undefined ? classMember.type?.getText() : "unknown";
			const bindableTypeText = `Bindable type: \`${bindableType}\``;

			// Add comment documentation if available
			const symbol = checker.getSymbolAtLocation(classMember.name);
			const commentDoc = ts.displayPartsToString(
				symbol?.getDocumentationComment(checker)
			);

			// Add default values. The value can be undefined, but that is correct in most cases.
			const defaultValue = classMember.initializer?.getText();
			const defaultValueText = `Default value: \`${defaultValue}\``;

			// Concatenate documentation parts with spacing
			const documentation = `${commentDoc}\n\n${bindableTypeText}\n\n${defaultValueText}`;

			// const quote = this.settings.quote;
			const quote = '\"'
			const varAsKebabCase = kebabCase(classMemberName);
			classMembers.push({
				documentation: {
					kind: MarkupKind.Markdown,
					value: documentation
				},
				detail: `${varAsKebabCase}`,
				insertText: `${varAsKebabCase}.$\{1:bind}=${quote}$\{0:${classMemberName}}${quote}`,
				insertTextFormat: InsertTextFormat.Snippet,
				kind: CompletionItemKind.Variable,
				label: `${varAsKebabCase} (Au Bindable)`
			});
		} else if (ts.isMethodDeclaration(classMember)) {

		}
	});
	return classMembers;
}