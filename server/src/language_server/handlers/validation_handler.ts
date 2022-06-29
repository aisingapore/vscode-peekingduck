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

import { Connection } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic } from "vscode-languageserver-types";
import { LanguageService } from "../../language_service/pkd_language_service";
import { SettingsState } from "../../pkd_settings";

export class ValidationHandler {
  private readonly connection: Connection;
  private languageService: LanguageService;
  private settings: SettingsState;

  constructor(
    connection: Connection,
    languageService: LanguageService,
    settings: SettingsState
  ) {
    this.connection = connection;
    this.languageService = languageService;
    this.settings = settings;

    this.settings.documents.onDidOpen((change) => {
      this.validate(change.document);
    });

    this.settings.documents.onDidClose((event) => {
      // Clear diagnostics for a closed file.
      this.connection.sendDiagnostics({
        uri: event.document.uri,
        diagnostics: [],
      });
    });
  }

  validate(textDocument: TextDocument): void {
    const uri = textDocument.uri;
    this.clearPendingValidation(uri);
    this.settings.pendingValidationRequests[uri] = setTimeout(() => {
      delete this.settings.pendingValidationRequests[uri];
      this.validateTextDocument(textDocument);
    }, this.settings.validationDelayMs);
  }

  async validateTextDocument(
    textDocument: TextDocument
  ): Promise<Diagnostic[]> {
    if (!textDocument) return [];
    return this.languageService
      .doValidation(textDocument)
      .then((diagnosticResults) => {
        this.connection.sendDiagnostics({
          uri: textDocument.uri,
          diagnostics: diagnosticResults,
        });
        return diagnosticResults;
      });
  }

  private clearPendingValidation(uri: string): void {
    const request = this.settings.pendingValidationRequests[uri];
    if (request !== undefined) {
      clearTimeout(request);
      delete this.settings.pendingValidationRequests[uri];
    }
  }
}
