/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

interface ExpectedDefinitionResult {
  /** Only check the range start */
  position: vscode.Position;
  /** Check part of file path */
  partOfFilePath: string;
}

import * as vscode from "vscode";
import * as assert from "assert";

import { activate, getTestApplicationFiles } from "./helper";

suite("Definition", () => {
  const applicationFile = getTestApplicationFiles();
  const docUri = vscode.Uri.file(applicationFile.viewPaths[0]);

  test("Complete class declaration", async () => {
    await testCompletion(docUri, new vscode.Position(5, 30), {
      position: new vscode.Position(10, 2),
      partOfFilePath: "testFixture/src/compo-user/compo-user.ts",
    });

    await testCompletion(docUri, new vscode.Position(8, 21), {
      position: new vscode.Position(8, 2),
      partOfFilePath: "testFixture/src/compo-user/compo-user.ts",
    });
  });
});

async function testCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedResult: ExpectedDefinitionResult
) {
  await activate(docUri);

  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualCompletionList = (await vscode.commands.executeCommand(
    "vscode.executeDefinitionProvider",
    docUri,
    position
  )) as vscode.Location[];

  // If expected shows up in actual, we are done.
  assert.equal(
    actualCompletionList[0].range.contains(expectedResult.position),
    true
  );
  assert.equal(
    actualCompletionList[0].uri.path.includes(expectedResult.partOfFilePath),
    true
  );
}
