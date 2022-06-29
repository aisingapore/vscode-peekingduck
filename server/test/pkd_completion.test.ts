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
import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  CompletionParams,
  InsertTextMode,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { LanguageSettings } from "../src/language_service/pkd_language_service";
import {
  CompletionDataKind,
  PkdCompletion,
} from "../src/language_service/services/pkd_completion";
import { PkdSchemaService } from "../src/language_service/services/pkd_schema_service";
import { completions, pipelineFiles as files } from "./utils/expected";
import {
  createCompletionParams,
  createTextDocument,
  LanguageSettingsSetup,
} from "./utils/helper";

const expect = chai.expect;

describe("PKD Completion", () => {
  let languageSettings: LanguageSettings;
  let schemaService: PkdSchemaService;

  before(() => {
    languageSettings = new LanguageSettingsSetup().withParse().languageSettings;
    schemaService = new PkdSchemaService();
    schemaService.registerSchemas(languageSettings);
  });

  beforeEach(() => {
    languageSettings = new LanguageSettingsSetup().withParse().languageSettings;
  });

  function complete(
    textDocument: TextDocument,
    completionParams: CompletionParams
  ): Promise<CompletionList> {
    const pkdCompletion = new PkdCompletion(schemaService);
    pkdCompletion.configure(languageSettings);
    return pkdCompletion.doCompletion(textDocument, completionParams);
  }

  async function resolve(
    completionList: CompletionList
  ): Promise<CompletionItem[]> {
    const pkdCompletion = new PkdCompletion(schemaService);
    pkdCompletion.configure(languageSettings);
    const result: CompletionItem[] = [];
    for (const item of completionList.items) {
      result.push(await pkdCompletion.doCompletionResolve(item));
    }
    return result;
  }

  it("should be empty if completion is disabled", async () => {
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 2, character: 4 },
      " "
    );
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.empty;

    const builtInPeriodCompletionParams = createCompletionParams(
      files.completion,
      { line: 4, character: 11 },
      "."
    );
    const builtInPeriodResult = await complete(
      textDocument,
      builtInPeriodCompletionParams
    );
    expect(builtInPeriodResult.items).is.empty;

    const customPeriodCompletionParams = createCompletionParams(
      files.completion,
      { line: 6, character: 17 },
      "."
    );
    const customPeriodResult = await complete(
      textDocument,
      customPeriodCompletionParams
    );
    expect(customPeriodResult.items).is.empty;

    const customPeriodCompletionParams2 = createCompletionParams(
      files.completion,
      { line: 8, character: 23 },
      "."
    );
    const customPeriodResult2 = await complete(
      textDocument,
      customPeriodCompletionParams2
    );
    expect(customPeriodResult2.items).is.empty;

    const builtInColonCompletionParams = createCompletionParams(
      files.completion,
      { line: 10, character: 15 },
      "."
    );
    const builtInColonResult = await complete(
      textDocument,
      builtInColonCompletionParams
    );
    expect(builtInColonResult.items).is.empty;

    const customColonCompletionParams = createCompletionParams(
      files.completion,
      { line: 12, character: 37 },
      "."
    );
    const customColonResult = await complete(
      textDocument,
      customColonCompletionParams
    );
    expect(customColonResult.items).is.empty;
  });

  it("should provide custom folder and built-in node type completions on space", async () => {
    languageSettings.complete = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 2, character: 4 },
      " "
    );
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(3);
    expect(result.items).to.deep.include(completions.custom.folder);
    expect(result.items).to.deep.include(completions.builtIn.type.dabble);
    expect(result.items).to.deep.include(completions.builtIn.type.model);
  });

  it("should provide only custom folder completions on space", async () => {
    languageSettings.complete = { builtIn: false, custom: true };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 2, character: 4 },
      " "
    );
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(1);
    expect(result.items).to.deep.include(completions.custom.folder);
  });

  it("should provide only built-in node type completions on space", async () => {
    languageSettings.complete = { builtIn: true, custom: false };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 2, character: 4 },
      " "
    );
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(2);
    expect(result.items).to.deep.include(completions.builtIn.type.dabble);
    expect(result.items).to.deep.include(completions.builtIn.type.model);
  });

  it("should provide built-in node name completion on period", async () => {
    languageSettings.complete = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 4, character: 11 },
      "."
    );
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(2);
    expect(result.items).to.deep.include(
      completions.builtIn.name.dabble.bboxCount
    );
    expect(result.items).to.deep.include(completions.builtIn.name.dabble.fps);
  });

  it("should provide custom node type completion on period", async () => {
    languageSettings.complete = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 6, character: 17 },
      "."
    );
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(2);
    expect(result.items).to.deep.include(completions.custom.type.myDabble);
    expect(result.items).to.deep.include(completions.custom.type.model);
  });

  it("should provide custom node name completion on period", async () => {
    languageSettings.complete = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 8, character: 23 },
      "."
    );
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(2);
    expect(result.items).to.deep.include(
      completions.custom.name.model.myModelNode
    );
    expect(result.items).to.deep.include(completions.custom.name.model.yolo);
  });

  it("should provide built-in node configs completion on colon", async () => {
    languageSettings.complete = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 10, character: 15 },
      ":"
    );
    const prefix = "\n      ";
    const suffix = ":";
    const expected = {
      label: "Configuration options",
      kind: CompletionItemKind.TypeParameter,
      data: CompletionDataKind.BuiltInConfig,
      insertTextMode: InsertTextMode.asIs,
      insertText:
        prefix +
        ["fps_log_display", "fps_log_freq", "dampen_fps"].join(
          suffix + prefix
        ) +
        suffix,
    };
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(1);
    expect(result.items).to.deep.include(expected);
  });

  it("should provide custom node configs completion on colon", async () => {
    languageSettings.complete = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 12, character: 37 },
      ":"
    );
    const prefix = "\n      ";
    const suffix = ":";
    const expected = {
      label: "Configuration options",
      kind: CompletionItemKind.TypeParameter,
      data: CompletionDataKind.CustomConfig,
      insertTextMode: InsertTextMode.asIs,
      insertText: prefix + ["model_conf_1"].join(suffix + prefix) + suffix,
    };
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(1);
    expect(result.items).to.deep.include(expected);
  });

  it("should not provide completions for invalid custom node folder, node types, and node names", async () => {
    languageSettings.complete = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.completion);

    const builtInNameParams = createCompletionParams(
      files.completion,
      { line: 14, character: 12 },
      "."
    );
    const builtInNameResult = await complete(textDocument, builtInNameParams);
    expect(builtInNameResult.items).is.empty;

    const customTypeParams = createCompletionParams(
      files.completion,
      { line: 16, character: 11 },
      "."
    );
    const customTypeResult = await complete(textDocument, customTypeParams);
    expect(customTypeResult.items).is.empty;

    const customNameParams = createCompletionParams(
      files.completion,
      { line: 18, character: 23 },
      "."
    );
    const customNameResult = await complete(textDocument, customNameParams);
    expect(customNameResult.items).is.empty;

    const builtInConfigsParams = createCompletionParams(
      files.completion,
      { line: 20, character: 23 },
      ":"
    );
    const builtInConfigsResult = await complete(
      textDocument,
      builtInConfigsParams
    );
    expect(builtInConfigsResult.items).is.empty;

    const customConfigsParams = createCompletionParams(
      files.completion,
      { line: 22, character: 30 },
      ":"
    );
    const customConfigsResult = await complete(
      textDocument,
      customConfigsParams
    );
    expect(customConfigsResult.items).is.empty;

    const customFolderParams = createCompletionParams(
      files.completion,
      { line: 24, character: 21 },
      "."
    );
    const customFolderResult = await complete(textDocument, customFolderParams);
    expect(customFolderResult.items).is.empty;
  });

  it("should not provide built-in completions when disabled", async () => {
    languageSettings.complete = { builtIn: false, custom: true };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 2, character: 4 },
      " "
    );
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(1);
    expect(result.items).to.deep.include(completions.custom.folder);

    const builtInNameParams = createCompletionParams(
      files.completion,
      { line: 4, character: 11 },
      "."
    );
    const builtInNameResult = await complete(textDocument, builtInNameParams);
    expect(builtInNameResult.items).is.empty;

    const builtInConfigParams = createCompletionParams(
      files.completion,
      { line: 10, character: 15 },
      ":"
    );
    const builtInConfigResult = await complete(
      textDocument,
      builtInConfigParams
    );
    expect(builtInConfigResult.items).is.empty;
  });

  it("should not provide custom completions when disabled", async () => {
    languageSettings.complete = { builtIn: true, custom: false };
    const textDocument = createTextDocument(files.completion);

    const completionParams = createCompletionParams(
      files.completion,
      { line: 2, character: 4 },
      " "
    );
    const result = await complete(textDocument, completionParams);
    expect(result.items).is.not.empty;
    expect(result.items.length).to.be.equal(2);
    expect(result.items).to.deep.include(completions.builtIn.type.dabble);
    expect(result.items).to.deep.include(completions.builtIn.type.model);

    const customTypeParams = createCompletionParams(
      files.completion,
      { line: 8, character: 23 },
      "."
    );
    const customNameResult = await complete(textDocument, customTypeParams);
    expect(customNameResult.items).is.empty;

    const customConfigParams = createCompletionParams(
      files.completion,
      { line: 12, character: 37 },
      ":"
    );
    const customConfigResult = await complete(textDocument, customConfigParams);
    expect(customConfigResult.items).is.empty;
  });

  it("should resolve completions", async () => {
    languageSettings.complete = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.completion);

    const params1 = createCompletionParams(
      files.completion,
      { line: 2, character: 4 },
      " "
    );
    const result1 = await resolve(await complete(textDocument, params1));
    expect(result1[0]).to.include({ detail: "Built-in node type" });
    expect(result1[1]).to.include({ detail: "Built-in node type" });
    expect(result1[2]).to.include({ detail: "Custom nodes folder name" });

    const params2 = createCompletionParams(
      files.completion,
      { line: 4, character: 11 },
      "."
    );
    const result2 = await resolve(await complete(textDocument, params2));
    expect(result2[0]).to.include({ detail: "Built-in node" });
    expect(result2[1]).to.include({ detail: "Built-in node" });

    const params3 = createCompletionParams(
      files.completion,
      { line: 6, character: 17 },
      "."
    );
    const result3 = await resolve(await complete(textDocument, params3));
    expect(result3[0]).to.include({ detail: "Custom node type" });
    expect(result3[1]).to.include({ detail: "Custom node type" });

    const params4 = createCompletionParams(
      files.completion,
      { line: 8, character: 23 },
      "."
    );
    const result4 = await resolve(await complete(textDocument, params4));
    expect(result4[0]).to.include({ detail: "Custom node" });
    expect(result4[1]).to.include({ detail: "Custom node" });

    const params5 = createCompletionParams(
      files.completion,
      { line: 10, character: 15 },
      ":"
    );
    const result5 = await resolve(await complete(textDocument, params5));
    expect(result5[0]).to.include({ detail: "Built-in node config" });

    const params6 = createCompletionParams(
      files.completion,
      { line: 12, character: 37 },
      ":"
    );
    const result6 = await resolve(await complete(textDocument, params6));
    expect(result6[0]).to.include({ detail: "Custom node config" });
  });

  it("should not provide completion if not a node entry", async () => {
    languageSettings.complete = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.completion);

    const params1 = createCompletionParams(
      files.completion,
      { line: 0, character: 6 },
      " "
    );
    const result1 = await complete(textDocument, params1);
    expect(result1.items).is.empty;

    const params2 = createCompletionParams(
      files.completion,
      { line: 0, character: 6 },
      "."
    );
    const result2 = await complete(textDocument, params2);
    expect(result2.items).is.empty;

    const params3 = createCompletionParams(
      files.completion,
      { line: 0, character: 6 },
      ":"
    );
    const result3 = await complete(textDocument, params3);
    expect(result3.items).is.empty;
  });
});
