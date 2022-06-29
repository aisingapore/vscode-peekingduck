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
  Connection,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
} from "vscode-languageserver";
import { LanguageHandler } from "./language_server/handlers/language_handler";
import { SettingsHandler } from "./language_server/handlers/settings_handler";
import { ValidationHandler } from "./language_server/handlers/validation_handler";
import {
  getLanguageService,
  LanguageService,
} from "./language_service/pkd_language_service";
import { SettingsState } from "./pkd_settings";

export class PkdServer {
  private readonly id: string = "peekingduck";
  private readonly connection: Connection;
  private settings: SettingsState;

  languageService!: LanguageService;
  languageHandler!: LanguageHandler;
  settingsHandler!: SettingsHandler;
  validationHandler!: ValidationHandler;

  constructor(connection: Connection, settings: SettingsState) {
    this.connection = connection;
    this.settings = settings;

    this.settings.documents.listen(this.connection);

    this.connection.onInitialize((params: InitializeParams) => {
      return this.initializeConnection(params);
    });
    this.connection.onInitialized(() => {
      this.settingsHandler.registerHandlers();
      this.settingsHandler.pullConfiguration();
    });
  }

  initializeConnection(params: InitializeParams): InitializeResult {
    this.settings.capabilities = params.capabilities;
    this.languageService = getLanguageService(this.id);
    this.settings.clientDynamicRegisterSupport = !!(
      this.settings.capabilities.textDocument &&
      this.settings.capabilities.textDocument.rangeFormatting &&
      this.settings.capabilities.textDocument.rangeFormatting
        .dynamicRegistration
    );
    this.settings.hasConfigurationCapability = !!(
      this.settings.capabilities.workspace &&
      !!this.settings.capabilities.workspace.configuration
    );
    this.registerHandlers();

    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: [" ", ".", ":"],
        },
      },
    };
  }

  start(): void {
    this.connection.listen();
  }

  private registerHandlers(): void {
    this.validationHandler = new ValidationHandler(
      this.connection,
      this.languageService,
      this.settings
    );
    this.settingsHandler = new SettingsHandler(
      this.connection,
      this.languageService,
      this.settings,
      this.validationHandler,
      this.id
    );
    this.languageHandler = new LanguageHandler(
      this.connection,
      this.languageService,
      this.settings,
      this.validationHandler
    );
    this.languageHandler.registerHandlers();
  }
}
