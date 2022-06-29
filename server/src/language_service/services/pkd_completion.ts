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
  CompletionItemKind,
  CompletionList,
  CompletionParams,
  InsertTextMode,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { LanguageSettings } from "../pkd_language_service";
import { PkdSchemaService } from "./pkd_schema_service";
import { guessIndentation } from "../utils/indentation_guesser";
import { TextBuffer } from "../utils/text_buffer";

export enum CompletionDataKind {
  BuiltInType = 0,
  BuiltInNode,
  BuiltInConfig,
  CustomFolderName,
  CustomType,
  CustomNode,
  CustomConfig,
}

export class PkdCompletion {
  private shouldComplete!: {
    builtIn: boolean;
    custom: boolean;
  };
  private schemaService: PkdSchemaService;

  constructor(schemaService: PkdSchemaService) {
    this.schemaService = schemaService;
  }

  configure(settings: LanguageSettings): void {
    this.shouldComplete = settings.complete;
  }

  async doCompletion(
    textDocument: TextDocument,
    completionParams: CompletionParams
  ): Promise<CompletionList> {
    const result = CompletionList.create([], false);
    // Get completion for new node definition
    if (completionParams.context?.triggerCharacter === " ") {
      const precedingChar = this.getPrecedingChar(
        textDocument,
        completionParams
      );
      // Early exit if not a new node entry
      if (precedingChar !== "-") return result;
      if (this.shouldComplete.builtIn) {
        const schema = this.schemaService.schemaConfigs.builtIn.schema;
        for (const key of schema.keys()) {
          result.items.push({
            label: key,
            kind: CompletionItemKind.TypeParameter,
            data: CompletionDataKind.BuiltInType,
          });
        }
      }
      if (this.shouldComplete.custom) {
        const customFolderName = this.schemaService.schemaConfigs.custom.name;
        result.items.push({
          label: customFolderName,
          kind: CompletionItemKind.Module,
          data: CompletionDataKind.CustomFolderName,
        });
      }
      return result;
    }
    // Get completion for next part in the node definition
    if (completionParams.context?.triggerCharacter === ".") {
      const precedingText = this.getPrecedingText(
        textDocument,
        completionParams
      );
      // Early exit if not a new node entry
      if (!precedingText.startsWith("-")) return result;
      const builtInSchema = this.schemaService.schemaConfigs.builtIn.schema;
      const customSchema = this.schemaService.schemaConfigs.custom.schema;
      const nodeParts = precedingText.substring(1).trim().split(".");
      // Early exit if not a valid node definition
      if (nodeParts.length > 2) return result;
      if (nodeParts.length === 2) {
        if (!this.shouldComplete.custom) return result;
        const [folderName, nodeType] = nodeParts;
        if (folderName !== this.schemaService.schemaConfigs.custom.name) {
          return result;
        }
        customSchema.get(nodeType)?.forEach((_value, key) => {
          result.items.push({
            label: key,
            kind: CompletionItemKind.Class,
            data: CompletionDataKind.CustomNode,
          });
        });
      }
      if (nodeParts.length === 1) {
        const nodePart = nodeParts[0];
        if (this.shouldComplete.builtIn) {
          builtInSchema.get(nodePart)?.forEach((_value, key) => {
            result.items.push({
              label: key,
              kind: CompletionItemKind.Class,
              data: CompletionDataKind.BuiltInNode,
            });
          });
        }
        if (
          this.shouldComplete.custom &&
          nodePart === this.schemaService.schemaConfigs.custom.name
        ) {
          for (const key of customSchema.keys()) {
            result.items.push({
              label: key,
              kind: CompletionItemKind.TypeParameter,
              data: CompletionDataKind.CustomType,
            });
          }
        }
      }
    }
    // Get completion for node config keys
    if (completionParams.context?.triggerCharacter === ":") {
      const precedingTextRaw = this.getPrecedingText(
        textDocument,
        completionParams,
        false
      );
      const precedingText = precedingTextRaw.trim();
      // Early exit if not a new node entry
      if (!precedingText.startsWith("-")) return result;

      const nodeDef = precedingText.substring(1).trim();
      const nodeParts = nodeDef.split(".");
      const textOffset = " ".repeat(precedingTextRaw.length - nodeDef.length);

      const textBuffer = new TextBuffer(textDocument);
      const indent = guessIndentation(textBuffer, 2, true);
      const indentation = indent.insertSpaces
        ? " ".repeat(indent.tabSize)
        : "\t";

      const prefix = `\n${textOffset}${indentation}`;
      const suffix = ":";

      if (this.shouldComplete.builtIn && nodeParts.length === 2) {
        const schema = this.schemaService.schemaConfigs.builtIn.schema;
        const [nodeType, nodeName] = nodeParts;
        const configs = schema.get(nodeType)?.get(nodeName)?.configs;
        if (configs !== undefined) {
          const completionText =
            prefix + configs.join(suffix + prefix) + suffix;
          result.items.push({
            label: "Configuration options",
            kind: CompletionItemKind.TypeParameter,
            data: CompletionDataKind.BuiltInConfig,
            insertTextMode: InsertTextMode.asIs,
            insertText: completionText,
          });
        }
      } else if (this.shouldComplete.custom && nodeParts.length === 3) {
        const schema = this.schemaService.schemaConfigs.custom.schema;
        const [folderName, nodeType, nodeName] = nodeParts;
        if (folderName === this.schemaService.schemaConfigs.custom.name) {
          const configs = schema.get(nodeType)?.get(nodeName)?.configs;
          if (configs !== undefined) {
            const completionText =
              prefix + configs.join(suffix + prefix) + suffix;
            result.items.push({
              label: "Configuration options",
              kind: CompletionItemKind.TypeParameter,
              data: CompletionDataKind.CustomConfig,
              insertTextMode: InsertTextMode.asIs,
              insertText: completionText,
            });
          }
        }
      }
    }

    return result;
  }

  async doCompletionResolve(item: CompletionItem): Promise<CompletionItem> {
    switch (item.data) {
      case CompletionDataKind.BuiltInNode:
        item.detail = "Built-in node";
        break;
      case CompletionDataKind.BuiltInType:
        item.detail = "Built-in node type";
        break;
      case CompletionDataKind.BuiltInConfig:
        item.detail = "Built-in node config";
        break;
      case CompletionDataKind.CustomFolderName:
        item.detail = "Custom nodes folder name";
        break;
      case CompletionDataKind.CustomNode:
        item.detail = "Custom node";
        break;
      case CompletionDataKind.CustomType:
        item.detail = "Custom node type";
        break;
      case CompletionDataKind.CustomConfig:
        item.detail = "Custom node config";
        break;
      /* istanbul ignore next */
      default: // Should not be called
        item.detail = "Others";
        break;
    }
    return item;
  }

  /**
   * Returns the character before the completion trigger character.
   *
   * @param textDocument Currently open text document.
   * @param completionParams Auto-completion parameters containing current
   *                         cursor location.
   * @returns The character before the trigger character.
   */
  private getPrecedingChar(
    textDocument: TextDocument,
    completionParams: CompletionParams
  ): string {
    const position = completionParams.position;
    return textDocument.getText({
      start: { line: position.line, character: position.character - 2 },
      end: { line: position.line, character: position.character - 1 },
    });
  }

  /**
   * Returns the line of text before the completion trigger character without
   * the leading whitespaces.
   *
   * @param textDocument Currently open text document.
   * @param completionParams Auto-completion parameters containing current
   *                         cursor location.
   * @param trim Flag to determine if the whitespaces should be removed.
   * @returns The line before the trigger character.
   */
  private getPrecedingText(
    textDocument: TextDocument,
    completionParams: CompletionParams,
    trim = true
  ): string {
    const position = completionParams.position;
    const precedingText = textDocument.getText({
      start: { line: position.line, character: 0 },
      end: { line: position.line, character: position.character - 1 },
    });
    return trim ? precedingText.trim() : precedingText;
  }
}
