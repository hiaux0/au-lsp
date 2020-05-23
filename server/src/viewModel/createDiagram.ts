import * as ts from 'typescript';
import { CompletionItemKind } from 'vscode-languageserver';

interface ClassInfo {
	[name: string]: {
		node: ts.Node;
	name: string;
	documentation: string;
	types: string;
		outGoingCalls?: ClassInfo;
}
}

export function createDiagram(classDeclaration: ts.ClassDeclaration, checker: ts.TypeChecker) {
	let classMembers: string[] = [];
	let classMethods: ClassInfo[] = [];
	let classVariables: ClassInfo[] = [];

	// 1. Parse class members (for diagram creation)
	classDeclaration.forEachChild(classMember => {
		if (ts.isPropertyDeclaration(classMember) || ts.isMethodDeclaration(classMember)) {
			const classMemberName = classMember.name?.getText();
			classMembers.push(classMemberName);

			// Get bindable type. If bindable type is undefined, we set it to be "unknown".
			const memberType = classMember.type?.getText() !== undefined ? classMember.type?.getText() : "";

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

	// 2. Assemble uml string
	const className = classDeclaration.name?.getText()!;
	const assembledString = assembleUmlString({ className, classMethods, classVariables });
}

/**
 * First iteration: mermaid-js markdown.
 */
function assembleUmlString(
	{ className, classMethods, classVariables }:
		{ className: string, classMethods: ClassInfo[], classVariables: ClassInfo[] }
) {
	const mermaidMdStringStart = '\`\`\`mermaid\n  classDiagram';
	const classNameString = `class ${className} {`;
	const mermaidMdStringEnd = '}\n\`\`\`';

	const classVariablesString = classVariables.reduce((acc, classInfo, index) => {
		const { name, types, documentation } = classInfo
		return `${acc}
			${name}: ${types} // ${documentation} [${index}]`;
	}, '');
	const classMethodsString = classMethods.reduce((acc, classInfo, index) => {
		const { name, types, documentation } = classInfo
		return `${acc}
      ${name}(): ${types} // ${documentation} [${classVariables.length + index}]`;
	}, '');

	const result = mermaidMdStringStart + '\n    ' +
		classNameString + '\n' +
		classVariablesString + '\n' +
		classMethodsString + '\n' +
		mermaidMdStringEnd;

	return result;
}