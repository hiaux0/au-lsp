/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from "vscode";
import * as assert from "assert";
import { intersection, map } from "lodash";
import { AureliaProgram } from "./../../../server/src/viewModel/AureliaProgram";
import { IComponentMap } from "./../../../server/src/viewModel/AureliaProgram";

import {
  activate,
  getTestApplicationFiles,
  getAureliaProgramForTesting,
} from "./helper";

function getTestItems(
  aureliaProgram: AureliaProgram,
  completionType: keyof IComponentMap
) {
  const componentMap = aureliaProgram.getComponentMap();
  const testItems = componentMap[completionType]
    .map((classDeclaration) => ({
      label: classDeclaration.label,
      kind: classDeclaration.kind,
    }))
    .sort(function (a, b) {
      if (a.label < b.label) {
        return -1;
      }
      if (a.label > b.label) {
        return 1;
      }
      return 0;
    });

  return testItems;
}

suite("Completion", () => {
  const applicationFile = getTestApplicationFiles();
  const docUri = vscode.Uri.file(applicationFile.viewPaths[0]);
  const aureliaProgram = getAureliaProgramForTesting();

  const classDeclarationTestItems = map(
    getTestItems(aureliaProgram, "classDeclarations"),
    "label"
  );
  // const classMemberTestItems = getTestItems(aureliaProgram, "classMembers");
  const classMemberTestItems = ["counter", "message", "thisIsMe"];
  const bindablesTestItems = ["increaseCounter"];

  test("Complete class declaration", async () => {
    await testCompletion(
      docUri,
      new vscode.Position(1, 0),
      classDeclarationTestItems
    );
  });

  test("Should complete class members", async () => {
    await testCompletion(
      docUri,
      new vscode.Position(2, 23),
      classMemberTestItems
    );
  });

  test("Should complete class members - bindables", async () => {
    await testCompletion(
      docUri,
      new vscode.Position(2, 23),
      bindablesTestItems
    );
  });
});

async function testCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedCompletionList: string[],
  triggerCharacter?: string
) {
  await activate(docUri);

  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualCompletionList = (await vscode.commands.executeCommand(
    "vscode.executeCompletionItemProvider",
    docUri,
    position,
    triggerCharacter
  )) as vscode.CompletionList;

  // assert.ok(actualCompletionList.items.length >= 2);
  const result = intersection(
    map(actualCompletionList.items, "label"),
    expectedCompletionList
  );
  // If expected shows up in actual, we are done.
  assert.equal(result.length, expectedCompletionList.length);
}
