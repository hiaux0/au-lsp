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

suite.only("Definition", () => {
  const applicationFile = getTestApplicationFiles();
  const docUri = vscode.Uri.file(applicationFile.viewPaths[0]);

  test("Complete class declaration", async () => {
    // <!-- Test: Go to definition [METHOD] {{ISSUE-15pHmj6C}}-->
    await testCompletion(docUri, new vscode.Position(7, 23), {
      position: new vscode.Position(24, 2),
      partOfFilePath: "testFixture/src/compo-user/compo-user.ts",
    });

    // <!-- Test: Go to definition [VARIABLE] {{ISSUE-oITTCXJc}}-->
    await testCompletion(docUri, new vscode.Position(11, 21), {
      position: new vscode.Position(16, 2),
      partOfFilePath: "testFixture/src/compo-user/compo-user.ts",
    });

    // <!-- Test: Go to definition [CUSTOM_ELEMENT] {{ISSUE-lj6q5QtN}}-->
    await testCompletion(docUri, new vscode.Position(15, 3), {
      position: new vscode.Position(1, 1),
      partOfFilePath: "testFixture/src/my-compo/my-compo.ts",
    });

    // <!-- Test: Go to definition [CUSTOM_ELEMENT_BINDABLE] {{ISSUE-8Q6EL3Ui}}-->
    await testCompletion(docUri, new vscode.Position(20, 5), {
      position: new vscode.Position(27, 2),
      partOfFilePath: "testFixture/src/my-compo/my-compo.ts",
    });

    // <!-- Test: Definition - Repeat for {{ISSUE-5ugNzvtm}} -->
    await testCompletion(docUri, new vscode.Position(33, 8), {
      position: new vscode.Position(30, 23),
      partOfFilePath: "testFixture/src/compo-user/compo-user.html",
    });

    // <!-- Text interpolated region {{ISSUE-sCxw9bfm}}-->
    await testCompletion(docUri, new vscode.Position(27, 8), {
      position: new vscode.Position(20, 2),
      partOfFilePath: "testFixture/src/compo-user/compo-user.ts",
    });

    // <!-- Text interpolated repeat-for region {{ISSUE-uMZ1grJD}}-->
    await testCompletion(docUri, new vscode.Position(30, 31), {
      position: new vscode.Position(20, 2),
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
