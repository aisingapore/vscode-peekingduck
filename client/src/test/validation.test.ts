/*-----------------------------------------------------------------------------
 * Copyright 2022 AI Singapore
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
 *----------------------------------------------------------------------------*/

import * as chai from "chai";
import * as vscode from "vscode";
import { pipelineFiles as files, validationErrors as errors } from "./expected";
import { activate, configure } from "./helper";

const expect = chai.expect;

describe("E2E validation", () => {
  const id = "peekingduck";
  let docUri: vscode.Uri;

  it("should not report if no config paths are set", async () => {
    docUri = files.invalid;
    await activate(docUri);
    await configure(false, false);

    await testDiagnostics(docUri, []);
  });

  it("should not report for good pipelines", async () => {
    docUri = files.good;
    await activate(docUri);
    await configure(true, true);

    await testDiagnostics(docUri, []);
  });

  it("should report YAML parser error", async () => {
    docUri = files.invalid;
    await activate(docUri);
    await configure(true, true);

    await testDiagnostics(docUri, [
      {
        message: "All mapping items must start at the same column",
        range: toRange(2, 0, 2, 1),
        severity: vscode.DiagnosticSeverity.Error,
        source: id,
      },
    ]);
  });

  it("should report PKD parser error", async () => {
    docUri = files.missingNodesKey;
    await activate(docUri);
    await configure(true, true);

    await testDiagnostics(docUri, [
      {
        message: "Top level 'nodes' key not found",
        range: toRange(0, 0, 0, 1),
        severity: vscode.DiagnosticSeverity.Error,
        source: id,
      },
    ]);
  });

  it("should report validation errors", async () => {
    docUri = files.bad;
    await activate(docUri);
    await configure(true, true);

    const expectedErrors = [];
    expectedErrors.push(...errors.builtIn);
    expectedErrors.push(...errors.general);
    expectedErrors.push(...errors.custom);
    await testDiagnostics(docUri, expectedErrors);
  });

  it("should limit the number of errors reported", async () => {
    docUri = files.bad;
    await activate(docUri);
    await configure(true, true, errors.builtIn.length);

    const expectedErrors = [];
    expectedErrors.push(...errors.builtIn);
    await testDiagnostics(docUri, expectedErrors);
  });

  it("should report only built-in validation errors", async () => {
    docUri = files.bad;
    await activate(docUri);
    await configure(true, false);

    const expectedErrors = [];
    expectedErrors.push(...errors.builtIn);
    expectedErrors.push(...errors.general);
    await testDiagnostics(docUri, expectedErrors);
  });

  it("should report custom validation errors", async () => {
    docUri = files.bad;
    await activate(docUri);
    await configure(false, true);

    const expectedErrors = [];
    expectedErrors.push(...errors.general);
    expectedErrors.push(...errors.custom);
    await testDiagnostics(docUri, expectedErrors);
  });
});

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
  const start = new vscode.Position(sLine, sChar);
  const end = new vscode.Position(eLine, eChar);
  return new vscode.Range(start, end);
}

async function testDiagnostics(
  docUri: vscode.Uri,
  expectedDiagnostics: vscode.Diagnostic[]
) {
  const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

  expect(actualDiagnostics.length).to.be.equal(expectedDiagnostics.length);

  expectedDiagnostics.forEach((expectedDiagnostic, i) => {
    const actualDiagnostic = actualDiagnostics[i];
    expect(actualDiagnostic.message).to.be.equal(expectedDiagnostic.message);
    expect(actualDiagnostic.range).to.deep.equal(expectedDiagnostic.range);
    expect(actualDiagnostic.severity).to.be.equal(expectedDiagnostic.severity);
  });
}
