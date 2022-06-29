/*-----------------------------------------------------------------------------
 * Modifications copyright 2022 AI Singapore
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See THIRDPARTYNOTICES in the project root
 * for license information.
 *----------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as path from "path";

interface Position {
  line: number;
  character: number;
}

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;

/**
 * Activates the aisingapore.vscode-peekingduck extension
 */
export async function activate(docUri: vscode.Uri) {
  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension("aisingapore.vscode-peekingduck")!;
  await ext.activate();
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);
    await sleep(2000); // Wait for server activation
    await doc.save();
  } catch (e) {
    console.error(e);
  }
}

export async function configure(
  builtIn: boolean,
  custom: boolean,
  maxNumberOfProblems = 100
) {
  await updateSettings(
    "path.package",
    builtIn ? getDocPath("./peekingduck") : ""
  );
  await updateSettings(
    "path.customNodes",
    custom ? getDocPath("./custom_nodes") : ""
  );
  await updateSettings("maxNumberOfProblems", maxNumberOfProblems);
  await sleep(1000);
}

export function createExpectedError(
  start: Position,
  end: Position,
  message: string,
  source: string
): vscode.Diagnostic {
  const startPos = new vscode.Position(start.line, start.character);
  const endPos = new vscode.Position(end.line, end.character);
  return {
    message,
    range: new vscode.Range(startPos, endPos),
    severity: vscode.DiagnosticSeverity.Error,
    source,
  };
}

export async function setTestContent(content: string): Promise<boolean> {
  const all = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  return editor.edit((eb) => eb.replace(all, content));
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, "../../../test_fixtures", p);
};

export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};

export const updateSettings = (
  setting: string,
  value: unknown
): Thenable<void> => {
  const pkdConfiguration = vscode.workspace.getConfiguration(
    "peekingduck",
    null
  );
  return pkdConfiguration.update(setting, value, true);
};
