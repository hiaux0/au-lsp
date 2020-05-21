import * as ts from 'typescript';
import { CompletionItemKind } from 'vscode-languageserver';

interface ClassInfo {
	name: string;
	documentation: string;
	types: string;
}

export function createDiagram(classDeclaration: ts.ClassDeclaration, checker: ts.TypeChecker) {
	let classMembers: string[] = [];
	let classMethods: ClassInfo[] = [];
	let classVariables: ClassInfo[] = [];

	classDeclaration.forEachChild(classMember => {
		if (ts.isPropertyDeclaration(classMember) || ts.isMethodDeclaration(classMember)) {
			const classMemberName = classMember.name?.getText();
			classMembers.push(classMemberName);

			// Get bindable type. If bindable type is undefined, we set it to be "unknown".
			const memberType = classMember.type?.getText() !== undefined ? classMember.type?.getText() : "unknown";

			// Add comment documentation if available
			const symbol = checker.getSymbolAtLocation(classMember.name);
			const commentDoc = ts.displayPartsToString(
				symbol?.getDocumentationComment(checker)
			);

			let defaultValueText: string = '';
			if (ts.isPropertyDeclaration(classMember)) {
				// Add default values. The value can be undefined, but that is correct in most cases.
				const defaultValue = classMember.initializer?.getText();
				defaultValueText = `Default value: \`${defaultValue}\``;
			}

			// Concatenate documentation parts with spacing
			// const documentation = `${commentDoc}\n\n${memberTypeText}\n\n${defaultValueText}`;

			const kind: CompletionItemKind = ts.isPropertyDeclaration(classMember)
				? CompletionItemKind.Variable
				: CompletionItemKind.Method;

			switch (kind) {
				case CompletionItemKind.Variable: {
					classVariables.push({
						name: classMemberName,
						documentation: commentDoc,
						types: memberType,
					});
					break;
				}
				case CompletionItemKind.Method: {
					classMethods.push({
						name: classMemberName,
						documentation: commentDoc,
						types: memberType,
					});
					break;
				}
			}
		}
	});
	classMembers
	classMethods
	classVariables
}