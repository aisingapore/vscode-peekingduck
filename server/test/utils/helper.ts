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

import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import {
  CompletionParams,
  CompletionTriggerKind,
  Diagnostic,
  DiagnosticSeverity,
  Position,
  Range,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createConnection } from "vscode-languageserver/node";
import { LanguageHandler } from "../../src/language_server/handlers/language_handler";
import { ValidationHandler } from "../../src/language_server/handlers/validation_handler";
import {
  LanguageService,
  LanguageSettings,
} from "../../src/language_service/pkd_language_service";
import { PkdServer } from "../../src/pkd_server";
import { SettingsState } from "../../src/pkd_settings";

export interface TestLanguageService {
  languageService: LanguageService;
  languageHandler: LanguageHandler;
  validationHandler: ValidationHandler;
}

export function createCompletionParams(
  filePath: string,
  position: Position,
  triggerCharacter: string
): CompletionParams {
  return {
    textDocument: { uri: url.pathToFileURL(filePath).toString() },
    position,
    context: {
      triggerKind: CompletionTriggerKind.TriggerCharacter,
      triggerCharacter,
    },
  };
}

export function createExpectedError(
  start: Position,
  end: Position,
  message: string,
  source: string
): Diagnostic {
  return Diagnostic.create(
    Range.create(start, end),
    message,
    DiagnosticSeverity.Error,
    undefined,
    source
  );
}

export function createTextDocument(filePath: string): TextDocument {
  const uri = url.pathToFileURL(filePath).toString();
  const content = fs.readFileSync(filePath, "utf8");
  return TextDocument.create(uri, "peekingduck", 0, content);
}

export function getPath(filePath: string): string {
  return path.resolve(__dirname, "../../../test_fixtures", filePath);
}

export function setupLanguageService(
  languageSettings: LanguageSettings
): TestLanguageService {
  const settings = new SettingsState();
  process.argv.push("--node-ipc");
  const connection = createConnection();
  const pkdServer = new PkdServer(connection, settings);
  pkdServer.initializeConnection({
    processId: null,
    capabilities: {
      textDocument: {
        rangeFormatting: { dynamicRegistration: true },
        moniker: { dynamicRegistration: false },
      },
      workspace: { configuration: true },
    },
    rootUri: null,
    workspaceFolders: null,
  });
  const languageService = pkdServer.languageService;
  const languageHandler = pkdServer.languageHandler;
  const validationHandler = pkdServer.validationHandler;
  languageService.configure(languageSettings);

  return {
    languageService,
    languageHandler,
    validationHandler,
  };
}

export class LanguageSettingsSetup {
  /** Disable everything by default */
  languageSettings = {
    complete: { builtIn: false, custom: false },
    configDir: { builtIn: "", custom: "" },
    parseSchema: { builtIn: false, custom: false },
    validate: { builtIn: false, custom: false },
    maxProblems: 100,
  };

  withParse(): LanguageSettingsSetup {
    this.languageSettings.configDir = {
      builtIn: getPath("./peekingduck/configs"),
      custom: getPath("./custom_nodes/configs"),
    };
    this.languageSettings.parseSchema = { builtIn: true, custom: true };
    return this;
  }

  withValidate(): LanguageSettingsSetup {
    this.languageSettings.validate = { builtIn: true, custom: true };
    return this;
  }
}
