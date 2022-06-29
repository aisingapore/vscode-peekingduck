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
import { ValidationHandler } from "../src/language_server/handlers/validation_handler";
import { validationErrors as errors } from "./utils/expected";
import { pipelineFiles as files } from "./utils/expected";
import {
  createTextDocument,
  LanguageSettingsSetup,
  setupLanguageService,
} from "./utils/helper";

const expect = chai.expect;

describe("Validation handler", () => {
  let validationHandler: ValidationHandler;

  before(() => {
    const languageSettings = new LanguageSettingsSetup()
      .withParse()
      .withValidate().languageSettings;
    const { validationHandler: valHandler } =
      setupLanguageService(languageSettings);
    validationHandler = valHandler;
  });

  function validate(textDocument: TextDocument): Promise<Diagnostic[]> {
    return validationHandler.validateTextDocument(textDocument);
  }

  it("should report validation errors", async () => {
    const textDocument = createTextDocument(files.bad);
    const result = await validate(textDocument);

    expect(result).is.not.empty;
    expect(result.length).to.be.equal(
      errors.builtIn.length + errors.general.length + errors.custom.length
    );
  });
});
