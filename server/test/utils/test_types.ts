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

import { Event } from "vscode-jsonrpc";
import {
  ApplyWorkspaceEditParams,
  ApplyWorkspaceEditResponse,
  ConfigurationItem,
  Connection,
  CreateFilesParams,
  DeleteFilesParams,
  NotificationHandler,
  RemoteWorkspace,
  RenameFilesParams,
  RequestHandler,
  WorkspaceEdit,
  WorkspaceFolder,
  WorkspaceFoldersChangeEvent,
} from "vscode-languageserver";

export class TestWorkspace implements RemoteWorkspace {
  connection: Connection;
  applyEdit(
    paramOrEdit: ApplyWorkspaceEditParams | WorkspaceEdit
  ): Promise<ApplyWorkspaceEditResponse> {
    throw new Error("Not implemented");
  }
  getConfiguration(): Promise<any>;
  getConfiguration(section: string): Promise<any>;
  getConfiguration(item: ConfigurationItem): Promise<any>;
  getConfiguration(items: ConfigurationItem[]): Promise<any[]>;
  getConfiguration(items?: any): Promise<any | any[]> {
    throw new Error("Not implemented");
  }
  getWorkspaceFolders(): Promise<WorkspaceFolder[] | null> {
    throw new Error("Not implemented");
  }
  onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
  onDidCreateFiles(handler: NotificationHandler<CreateFilesParams>): void {
    throw new Error("Not implemented");
  }
  onDidRenameFiles(handler: NotificationHandler<RenameFilesParams>): void {
    throw new Error("Not implemented");
  }
  onDidDeleteFiles(handler: NotificationHandler<DeleteFilesParams>): void {
    throw new Error("Not implemented");
  }
  onWillCreateFiles(
    handler: RequestHandler<CreateFilesParams, WorkspaceEdit | null, never>
  ): void {
    throw new Error("Not implemented");
  }
  onWillRenameFiles(
    handler: RequestHandler<RenameFilesParams, WorkspaceEdit | null, never>
  ): void {
    throw new Error("Not implemented");
  }
  onWillDeleteFiles(
    handler: RequestHandler<DeleteFilesParams, WorkspaceEdit | null, never>
  ): void {
    throw new Error("Not implemented");
  }
}
