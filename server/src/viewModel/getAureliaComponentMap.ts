import { AureliaProgram, IComponentMap } from './AureliaProgram';
import * as ts from 'typescript';
import * as Path from 'path';
import { CompletionItem, MarkupKind, InsertTextFormat, CompletionItemKind } from 'vscode-languageserver';
import { kebabCase } from '@aurelia/kernel';

export function getAureliaComponentMap(aureliaProgram: AureliaProgram) {
	const paths = aureliaProgram.getProjectFiles();
	let classStatement: CompletionItem | undefined;
	let classStatements: CompletionItem[] = [];

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

				classStatement = getAureliaViewModelClassStatement(sourceFile!, checker)
				if (classStatement === undefined) {
					console.log('No Class statement found')
					break;
				}
				classStatements.push(classStatement);
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
	}
	aureliaProgram.setComponentMap(result);
}

function getAureliaViewModelClassStatement(sourceFile: ts.SourceFile, checker: ts.TypeChecker) {
	// if (sourceFile.fileName !== '/Users/hdn/Desktop/aurelia-lsp/client/testFixture/src/my-compo/my-compo.ts') return;
	let result: CompletionItem | undefined;

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
			node as ts.ClassDeclaration;
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

	return result;
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