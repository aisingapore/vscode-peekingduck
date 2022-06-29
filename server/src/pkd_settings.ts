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

import { ClientCapabilities, TextDocuments } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";

export interface Settings {
  maxProblems: number;
  path: {
    builtIn: string;
    custom: string;
  };
}

export class SettingsState {
  builtIn = {
    ok: false,
    configDir: "",
  };
  custom = {
    ok: false,
    configDir: "",
  };
  maxProblems = 100;

  pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
  validationDelayMs = 200;

  /** Simple text document manager. */
  documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
  /** Language client configuration. */
  capabilities?: ClientCapabilities;
  clientDynamicRegisterSupport = false;
  hasConfigurationCapability = false;
}
