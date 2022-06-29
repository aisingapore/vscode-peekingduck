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
import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic } from "vscode-languageserver-types";
import { LanguageSettings } from "../src/language_service/pkd_language_service";
import { PkdSchemaService } from "../src/language_service/services/pkd_schema_service";
import { PkdValidation } from "../src/language_service/services/pkd_validation";
import { pipelineFiles as files } from "./utils/expected";
import {
  createExpectedError,
  createTextDocument,
  LanguageSettingsSetup,
} from "./utils/helper";
import { id, validationErrors as errors } from "./utils/expected";

const expect = chai.expect;

describe("PKD Validation", () => {
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

  function validate(textDocument: TextDocument): Promise<Diagnostic[]> {
    const pkdValidation = new PkdValidation(schemaService, id);
    pkdValidation.configure(languageSettings);
    return pkdValidation.doValidation(textDocument);
  }

  it("should be empty if validation is disabled", async () => {
    const textDocument = createTextDocument(files.invalid);
    const result = await validate(textDocument);

    expect(result).is.empty;
  });

  it("should be empty for good pipelines", async () => {
    languageSettings.validate = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.good);
    const result = await validate(textDocument);

    expect(result).is.empty;
  });

  it("should report YAML parser error", async () => {
    languageSettings.validate = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.invalid);
    const result = await validate(textDocument);

    expect(result).is.not.empty;
    expect(result.length).to.be.equal(1);
    expect(result[0]).deep.equal(
      createExpectedError(
        { line: 2, character: 0 },
        { line: 2, character: 1 },
        "All mapping items must start at the same column",
        id
      )
    );
  });

  it("should report PKD parser error", async () => {
    languageSettings.validate = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.missingNodesKey);
    const result = await validate(textDocument);

    expect(result).is.not.empty;
    expect(result.length).to.be.equal(1);
    expect(result[0]).deep.equal(
      createExpectedError(
        { line: 0, character: 0 },
        { line: 0, character: 1 },
        "Top level 'nodes' key not found",
        id
      )
    );
  });

  it("should report validation errors", async () => {
    languageSettings.validate = { builtIn: true, custom: true };
    const textDocument = createTextDocument(files.bad);
    const result = await validate(textDocument);

    expect(result).is.not.empty;
    expect(result.length).to.be.equal(
      errors.builtIn.length + errors.general.length + errors.custom.length
    );
    // Test YAML file contains 3 error producing sections: built-in, general,
    // and custom
    for (let i = 0; i < errors.builtIn.length; ++i) {
      expect(result[i]).deep.equal(errors.builtIn[i]);
    }
    for (let i = 0; i < errors.general.length; ++i) {
      expect(result[errors.builtIn.length + i]).deep.equal(errors.general[i]);
    }
    for (let i = 0; i < errors.custom.length; ++i) {
      expect(
        result[errors.builtIn.length + errors.general.length + i]
      ).deep.equal(errors.custom[i]);
    }
  });

  it("should report only built-in validation errors", async () => {
    languageSettings.validate = { builtIn: true, custom: false };
    const textDocument = createTextDocument(files.bad);
    const result = await validate(textDocument);

    expect(result).is.not.empty;
    expect(result.length).to.be.equal(
      errors.builtIn.length + errors.general.length
    );
    for (let i = 0; i < errors.builtIn.length; ++i) {
      expect(result[i]).deep.equal(errors.builtIn[i]);
    }
    for (let i = 0; i < errors.general.length; ++i) {
      expect(result[errors.builtIn.length + i]).deep.equal(errors.general[i]);
    }
  });

  it("should report only custom validation errors", async () => {
    languageSettings.validate = { builtIn: false, custom: true };
    const textDocument = createTextDocument(files.bad);
    const result = await validate(textDocument);

    expect(result).is.not.empty;
    expect(result.length).to.be.equal(
      errors.general.length + errors.custom.length
    );
    for (let i = 0; i < errors.general.length; ++i) {
      expect(result[i]).deep.equal(errors.general[i]);
    }
    for (let i = 0; i < errors.custom.length; ++i) {
      expect(result[errors.general.length + i]).deep.equal(errors.custom[i]);
    }
  });
});
