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

import {
  CompletionItem,
  CompletionList,
  CompletionParams,
  Connection,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { LanguageService } from "../../language_service/pkd_language_service";
import { SettingsState } from "../../pkd_settings";
import { ValidationHandler } from "./validation_handler";

export class LanguageHandler {
  private readonly connection: Connection;
  private languageService: LanguageService;
  private settings: SettingsState;
  private validationHandler: ValidationHandler;

  constructor(
    connection: Connection,
    languageService: LanguageService,
    settings: SettingsState,
    validationHandler: ValidationHandler
  ) {
    this.connection = connection;
    this.languageService = languageService;
    this.settings = settings;
    this.validationHandler = validationHandler;
  }

  registerHandlers(): void {
    this.connection.onCompletion((completionParams) => {
      return this.handleCompletion(completionParams);
    });
    this.connection.onCompletionResolve((item) => {
      return this.handleCompletionResolve(item);
    });
    this.settings.documents.onDidSave((change) => {
      this.handleValidation(change.document);
    });
  }

  private async handleCompletion(
    completionParams: CompletionParams
  ): Promise<CompletionList> {
    const textDocument = this.settings.documents.get(
      completionParams.textDocument.uri
    );
    const result: CompletionList = {
      isIncomplete: false,
      items: [],
    };
    if (!textDocument) return result;
    return this.languageService.doCompletion(textDocument, completionParams);
  }

  private async handleCompletionResolve(
    item: CompletionItem
  ): Promise<CompletionItem> {
    return this.languageService.doCompletionResolve(item);
  }

  private async handleValidation(textDocument: TextDocument): Promise<void> {
    this.validationHandler.validate(textDocument);
  }
}
