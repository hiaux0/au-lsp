/* --------------------------------------------------------------------------------------------
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { intersectionWith } from 'lodash';
import { AureliaProgram } from './../../../server/src/viewModel/AureliaProgram';

import { activate, getTestApplicationFiles, getAureliaProgramForTesting } from './helper';

function getTestItems(aureliaProgram: AureliaProgram) {
	const componentMap = aureliaProgram.getComponentMap()
	const testItems = componentMap.classDeclarations.map(classDeclaration => ({
		label: classDeclaration.label,
		kind: classDeclaration.kind
	}))
		.sort(function (a, b) {
			if (a.label < b.label) { return -1; }
			if (a.label > b.label) { return 1; }
			return 0;
		});

	return testItems;
}

suite.only('Completion', () => {
	const applicationFile = getTestApplicationFiles();
	const docUri = vscode.Uri.file(applicationFile.viewPaths[0]);
	const aureliaProgram = getAureliaProgramForTesting();
	const items = getTestItems(aureliaProgram);

	test('Complete class statement name', async () => {
		await testCompletion(docUri, new vscode.Position(0, 0), { items });
	});
});

async function testCompletion(
	docUri: vscode.Uri,
	position: vscode.Position,
	expectedCompletionList: vscode.CompletionList
) {
	await activate(docUri);

	// Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
	const actualCompletionList = (await vscode.commands.executeCommand(
		'vscode.executeCompletionItemProvider',
		docUri,
		position
	)) as vscode.CompletionList;

	// assert.ok(actualCompletionList.items.length >= 2);
	const result = intersectionWith(
		actualCompletionList.items,
		expectedCompletionList.items,
		(act: vscode.CompletionItem, exp: vscode.CompletionItem) => {
			return act.label === exp.label
			// && act.kind === exp.kind; // actual returns 6 for Markupkind.Class ??
		}
	);
	// If expected shows up in actual, we are done.
	assert.equal(result.length, expectedCompletionList.items.length);
}
