/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from "vscode";
import * as assert from "assert";
import { intersection, map } from "lodash";
import { kebabCase } from "@aurelia/kernel";
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
  const aureliaProgram = getAureliaProgramForTesting();
  const docUri = vscode.Uri.file(applicationFile.viewPaths[0]);

  const classDeclarationTestItems = map(
    getTestItems(aureliaProgram, "classDeclarations"),
    "label"
  );

  /** compo-user */
  const classMemberTestItems = [
    "counter",
    "message",
    "increaseCounter",
    "rule",
    "grammarRules",
  ];
  const bindablesTestItems = ["thisIsMe"];

  /** my-compo */
  const testPrefix = "(Au Bindable) ";
  const bindablesTestItems_MyCompo = ["stringBindable", "interBindable"];
  const bindablesTestItems_MyCompo__asKebab = bindablesTestItems_MyCompo.map(
    (bindableName) => {
      return `${testPrefix}${kebabCase(bindableName)}`;
    }
  );

  suite.skip("Completion - Custom Element", () => {
    test("Should complete custom element", async () => {
      await testCompletion(
        docUri,
        new vscode.Position(0, 0),
        classDeclarationTestItems,
        "<"
      );
    });
  });

  suite("Completion - Attribute region", () => {
    // <!-- Test: Completion {{ISSUE-9WZg54qT}}-->
    test("Should complete class members", async () => {
      await testCompletion(
        docUri,
        new vscode.Position(3, 23),
        classMemberTestItems
      );
    });

    // <!-- Test: Completion {{ISSUE-9WZg54qT}}-->
    test("Should complete class bindables", async () => {
      await testCompletion(
        docUri,
        new vscode.Position(3, 23),
        bindablesTestItems
      );
    });
  });

  suite("Completion - Text interpolated region", () => {
    test("Should complete class members", async () => {
      await testCompletion(
        docUri,
        new vscode.Position(27, 3),
        classMemberTestItems
      );
    });

    test("Should complete class bindables", async () => {
      await testCompletion(
        docUri,
        new vscode.Position(27, 3),
        bindablesTestItems
      );
    });
  });

  suite.only("Completion - Custom element region", () => {
    test("Bindables", async () => {
      await testCompletion(
        docUri,
        new vscode.Position(20, 4),
        bindablesTestItems_MyCompo__asKebab
      );
    });
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
