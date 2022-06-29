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
  Diagnostic,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { PkdCompletion } from "./services/pkd_completion";
import { PkdSchemaService } from "./services/pkd_schema_service";
import { PkdValidation } from "./services/pkd_validation";

export interface LanguageSettings {
  /** Flag to indicate if we want to provide auto-completion. */
  complete: {
    builtIn: boolean;
    custom: boolean;
  };
  /** Paths to the PeekingDuck and custom nodes configs directory. */
  configDir: {
    builtIn: string;
    custom: string;
  };
  parseSchema: {
    builtIn: boolean;
    custom: boolean;
  };
  /** Flag to indicate if we want to validate the pipeline file. */
  validate: {
    builtIn: boolean;
    custom: boolean;
  };
  /** Maximum number of problems to report. */
  maxProblems: number;
}

export interface LanguageService {
  configure(settings: LanguageSettings): void;
  doCompletion(
    document: TextDocument,
    completionParams: CompletionParams
  ): Promise<CompletionList>;
  doCompletionResolve(item: CompletionItem): Promise<CompletionItem>;
  doValidation(document: TextDocument): Promise<Diagnostic[]>;
}

export function getLanguageService(id: string): LanguageService {
  const schemaService = new PkdSchemaService();
  const pkdCompletion = new PkdCompletion(schemaService);
  const pkdValidation = new PkdValidation(schemaService, id);
  return {
    configure: (settings) => {
      schemaService.clearSchemas();
      schemaService.registerSchemas(settings);
      pkdCompletion.configure(settings);
      pkdValidation.configure(settings);
    },
    doCompletion: pkdCompletion.doCompletion.bind(pkdCompletion),
    doCompletionResolve: pkdCompletion.doCompletionResolve.bind(pkdCompletion),
    doValidation: pkdValidation.doValidation.bind(pkdValidation),
  };
}
