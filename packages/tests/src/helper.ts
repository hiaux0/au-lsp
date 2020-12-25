/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

/**
 * This import needed to run the tests, else it throws error
 * `TypeError: Reflect.defineMetadata is not a function`
 */
import "reflect-metadata";
import * as vscode from "vscode";
import * as path from "path";
import * as ts from "typescript";

import { Container } from "aurelia-dependency-injection";
import { AureliaProgram } from "../../server/src/viewModel/AureliaProgram";
import { createAureliaWatchProgram } from "../../server/src/viewModel/createAureliaWatchProgram";
import { setAureliaComponentMap } from "../../server/src/viewModel/setAureliaComponentMap";

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;

/**
 * Activates the vscode.lsp-sample extension
 */
export async function activate(docUri: vscode.Uri) {
  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension("vscode-samples.lsp-sample")!;
  await ext.activate();
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);
    await sleep(2000); // Wait for server activation
  } catch (e) {
    console.error(e);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, "../../testFixture", p);
};
export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<boolean> {
  const all = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  return editor.edit((eb) => eb.replace(all, content));
}

interface IApplicationFiles {
  viewPaths: string[];
  viewModelPaths: string[];
}

/**
 * From the testFixture dir, get all files.
 * We test all the files simultaneously.
 */
export function getTestApplicationFiles() {
  const sourceDirectory = path.resolve(__dirname, "../../../../testFixture");
  const filePaths = ts.sys.readDirectory(
    sourceDirectory,
    ["html"],
    ["node_modules", "aurelia_project"],
    ["src"]
  );
  let applicationFiles: IApplicationFiles = {
    viewPaths: [],
    viewModelPaths: [],
  };

  filePaths.forEach((filePath) => {
    const extName = path.extname(filePath);
    switch (extName) {
      case ".html": {
        applicationFiles.viewPaths.push(filePath);
        break;
      }
      case ".ts": {
        applicationFiles.viewModelPaths.push(filePath);
        break;
      }
    }
  });

  return applicationFiles;
}

/**
 * Get the same aurelia program, as used in the acutal extension.
 */
export function getAureliaProgramForTesting() {
  const container = new Container();
  const aureliaProgram = container.get(AureliaProgram);
  const sourceDirectory = path.resolve(__dirname, "../../../../testFixture");

  createAureliaWatchProgram(aureliaProgram, sourceDirectory);
  setAureliaComponentMap(aureliaProgram, sourceDirectory);
  return aureliaProgram;
}
