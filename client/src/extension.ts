/*-----------------------------------------------------------------------------
 * Modifications copyright 2022 AI Singapore
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
 *
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See THIRDPARTYNOTICES in the project root
 * for license information.
 *----------------------------------------------------------------------------*/

import { ExtensionContext } from "vscode";
import {
  LanguageClient,
  NodeModule,
  TransportKind,
} from "vscode-languageclient/node";

const id = "peekingduck";
const name = "PeekingDuck Language Server";
const documentSelector = [{ language: "peekingduck" }];

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const run: NodeModule = {
    module: context.asAbsolutePath("./dist/languageserver.js"),
    transport: TransportKind.ipc,
  };
  // The debug options for the server --inspect=6009: runs the server in Node's
  // Inspector mode so VS Code can attach to the server for debugging
  const debug: NodeModule = {
    ...run,
    options: { execArgv: ["--nolazy", "--inspect=6009"] },
  };

  // Create the language client.
  client = new LanguageClient(
    id,
    name,
    { run, debug },
    { documentSelector: documentSelector }
  );

  // Start the client. This will also launch the server
  const disposable = client.start();
  context.subscriptions.push(disposable);
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
