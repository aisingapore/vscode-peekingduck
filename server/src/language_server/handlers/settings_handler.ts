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
import {
  Connection,
  DidChangeConfigurationNotification,
} from "vscode-languageserver";
import {
  LanguageService,
  LanguageSettings,
} from "../../language_service/pkd_language_service";
import { Settings, SettingsState } from "../../pkd_settings";
import { ValidationHandler } from "./validation_handler";

export class SettingsHandler {
  private readonly connection: Connection;
  private readonly id: string;
  private readonly languageService: LanguageService;
  private readonly settings: SettingsState;
  private readonly validationHandler: ValidationHandler;

  constructor(
    connection: Connection,
    languageService: LanguageService,
    settings: SettingsState,
    validationHandler: ValidationHandler,
    id: string
  ) {
    this.connection = connection;
    this.languageService = languageService;
    this.settings = settings;
    this.validationHandler = validationHandler;
    this.id = id;
  }

  async registerHandlers(): Promise<void> {
    if (
      this.settings.hasConfigurationCapability &&
      this.settings.clientDynamicRegisterSupport
    ) {
      await this.connection.client.register(
        DidChangeConfigurationNotification.type
      );
    }
    this.connection.onDidChangeConfiguration(() => this.pullConfiguration());
  }

  async pullConfiguration(): Promise<void> {
    const result = await this.connection.workspace.getConfiguration({
      section: this.id,
    });
    const settings: Settings = {
      maxProblems: result.maxNumberOfProblems,
      path: {
        builtIn: result.path.package,
        custom: result.path.customNodes,
      },
    };
    await this.setConfiguration(settings);
  }

  /**
   * Update SettingsState.
   *
   * @param settings Parsed configuration settings.
   */
  private async setConfiguration(settings: Settings): Promise<void> {
    const builtInConfigDir = path.join(settings.path.builtIn, "configs");
    try {
      await fs.promises.access(builtInConfigDir, fs.constants.R_OK);
      this.settings.builtIn.ok = true;
      this.settings.builtIn.configDir = builtInConfigDir;
    } catch {
      this.settings.builtIn.ok = false;
      this.settings.builtIn.configDir = "";
    }
    const customConfigDir = path.join(settings.path.custom, "configs");
    try {
      await fs.promises.access(customConfigDir, fs.constants.R_OK);
      this.settings.custom.ok = true;
      this.settings.custom.configDir = customConfigDir;
    } catch {
      this.settings.custom.ok = false;
      this.settings.custom.configDir = "";
    }
    this.settings.maxProblems = settings.maxProblems;

    this.updateConfiguration();
  }

  /**
   * Called when extension configuration is changed. Re-validate any open
   * PeekingDuck pipeline files.
   */
  private updateConfiguration(): void {
    const languageSettings: LanguageSettings = {
      complete: {
        builtIn: this.settings.builtIn.ok,
        custom: this.settings.custom.ok,
      },
      configDir: {
        builtIn: this.settings.builtIn.configDir,
        custom: this.settings.custom.configDir,
      },
      parseSchema: {
        builtIn: this.settings.builtIn.ok,
        custom: this.settings.custom.ok,
      },
      validate: {
        builtIn: this.settings.builtIn.ok,
        custom: this.settings.custom.ok,
      },
      maxProblems: this.settings.maxProblems,
    };
    this.languageService.configure(languageSettings);
    this.settings.documents.all().forEach((document) => {
      this.validationHandler.validate(document);
    });
  }
}
