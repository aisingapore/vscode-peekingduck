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
  CompletionTriggerKind,
  InsertTextMode,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { LanguageSettings } from "../pkd_language_service";
import { PkdSchemaService } from "./pkd_schema_service";
import { guessIndentation } from "../utils/indentation_guesser";
import { TextBuffer } from "../utils/text_buffer";
import { PkdParser } from "../parsers/pkd_parser";

export enum CompletionItemData {
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
  /** Pipeline parser, to parse pipeline files such as `pipeline_config.yml` */
  private parser: PkdParser;

  constructor(schemaService: PkdSchemaService) {
    this.schemaService = schemaService;
    this.parser = new PkdParser();
  }

  configure(settings: LanguageSettings): void {
    this.shouldComplete = settings.complete;
  }

  async doCompletion(
    textDocument: TextDocument,
    params: CompletionParams
  ): Promise<CompletionList> {
    const result = CompletionList.create([], false);
    // Get completion for new node definition
    if (params.context?.triggerCharacter === " ") {
      const precedingChar = this.getPrecedingChar(textDocument, params);
      // Early exit if not a new node entry
      if (precedingChar !== "-") return result;
      if (this.shouldComplete.builtIn) {
        const items = this.getNodeTypeCompletionItems("builtIn");
        result.items.push(...items);
      }
      if (this.shouldComplete.custom) {
        result.items.push(this.getFolderNameCompletionItem());
      }
      return result;
    }
    // Get completion for next part in the node definition
    if (params.context?.triggerCharacter === ".") {
      const precedingText = this.getPrecedingText(textDocument, params);
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
        const items = this.getNodeNameCompletionItems("custom", nodeType);
        result.items.push(...items);
      }
      if (nodeParts.length === 1) {
        const nodePart = nodeParts[0];
        if (this.shouldComplete.builtIn) {
          const items = this.getNodeNameCompletionItems("builtIn", nodePart);
          result.items.push(...items);
        }
        if (
          this.shouldComplete.custom &&
          nodePart === this.schemaService.schemaConfigs.custom.name
        ) {
          const items = this.getNodeTypeCompletionItems("custom");
          result.items.push(...items);
        }
      }
    }
    // Get completion for node config keys
    if (params.context?.triggerCharacter === ":") {
      const precedingTextRaw = this.getPrecedingText(
        textDocument,
        params,
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
        const [nodeType, nodeName] = nodeParts;
        const [ok, item] = this.getNodeConfigSnippet(
          "builtIn",
          nodeType,
          nodeName,
          prefix,
          suffix
        );
        if (ok) result.items.push(item);
      } else if (this.shouldComplete.custom && nodeParts.length === 3) {
        const [folderName, nodeType, nodeName] = nodeParts;
        if (folderName === this.schemaService.schemaConfigs.custom.name) {
          const [ok, item] = this.getNodeConfigSnippet(
            "custom",
            nodeType,
            nodeName,
            prefix,
            suffix
          );
          if (ok) result.items.push(item);
        }
      }
    }
    if (params.context?.triggerKind === CompletionTriggerKind.Invoked) {
      const precedingTextRaw = this.getPrecedingText(
        textDocument,
        params,
        false
      );
      const precedingText = precedingTextRaw.trim();
      if (precedingText.startsWith("-")) {
        const nodeParts = precedingText.substring(1).trim().split(".");
        console.log(nodeParts);
        // Early exit if not a valid node definition
        if (nodeParts.length > 3) return result;
        if (nodeParts.length === 3 && this.shouldComplete.custom) {
          const [folderName, nodeType, _nodeName] = nodeParts;
          if (folderName !== this.schemaService.schemaConfigs.custom.name) {
            return result;
          }
          const items = this.getNodeNameCompletionItems("custom", nodeType);
          result.items.push(...items);
        }
        if (nodeParts.length === 2) {
          const nodePart = nodeParts[0];
          if (this.shouldComplete.builtIn) {
            const items = this.getNodeNameCompletionItems("builtIn", nodePart);
            result.items.push(...items);
          }
          if (
            this.shouldComplete.custom &&
            nodePart === this.schemaService.schemaConfigs.custom.name
          ) {
            const items = this.getNodeTypeCompletionItems("custom");
            result.items.push(...items);
          }
        }
        if (nodeParts.length === 1) {
          if (this.shouldComplete.builtIn) {
            const items = this.getNodeTypeCompletionItems("builtIn");
            result.items.push(...items);
          }
          if (this.shouldComplete.custom) {
            result.items.push(this.getFolderNameCompletionItem());
          }
        }
      } else {
        const nodeDefMap = this.parser.parseNodeDefMap(
          textDocument,
          params.position.line
        );
        // Find the closest node definition to the trigger line
        let line = params.position.line;
        while (line >= 0 && !nodeDefMap.has(line)) --line;
        const node = nodeDefMap.get(line);

        if (node?.nodeMap !== undefined) {
          const nodeParts = node.nodeMap.nodeString.value.split(".");
          const nodeConfigs = node.nodeMap.nodeConfigs.map(
            ({ value }) => value
          );
          if (nodeParts.length == 2 && this.shouldComplete.builtIn) {
            const [nodeType, nodeName] = nodeParts;
            const items = this.getNodeConfigCompletionItems(
              "builtIn",
              nodeType,
              nodeName,
              nodeConfigs
            );
            result.items.push(...items);
          }
          if (nodeParts.length === 3 && this.shouldComplete.custom) {
            const [folderName, nodeType, nodeName] = nodeParts;
            if (folderName !== this.schemaService.schemaConfigs.custom.name) {
              return result;
            }
            const items = this.getNodeConfigCompletionItems(
              "custom",
              nodeType,
              nodeName,
              nodeConfigs
            );
            result.items.push(...items);
          }
        }
      }
    }
    return result;
  }

  async doCompletionResolve(item: CompletionItem): Promise<CompletionItem> {
    switch (item.data) {
      case CompletionItemData.BuiltInNode:
        item.detail = "Built-in node";
        break;
      case CompletionItemData.BuiltInType:
        item.detail = "Built-in node type";
        break;
      case CompletionItemData.BuiltInConfig:
        item.detail = "Built-in node config";
        break;
      case CompletionItemData.CustomFolderName:
        item.detail = "Custom nodes folder name";
        break;
      case CompletionItemData.CustomNode:
        item.detail = "Custom node";
        break;
      case CompletionItemData.CustomType:
        item.detail = "Custom node type";
        break;
      case CompletionItemData.CustomConfig:
        item.detail = "Custom node config";
        break;
      /* istanbul ignore next */
      default: // Should not be called
        item.detail = "Others";
        break;
    }
    return item;
  }

  private getFolderNameCompletionItem(): CompletionItem {
    return {
      label: this.schemaService.schemaConfigs.custom.name,
      kind: CompletionItemKind.Module,
      data: CompletionItemData.CustomFolderName,
    };
  }

  /**
   *  Creates an array of node config completion items.
   *
   * @param schemaType Type of schema: builtIn or custom.
   * @param nodeType Type of node.
   * @param nodeName Name of node.
   * @param presentConfigs The node configs which has already been typed by the
   *                       user.
   * @returns An array of CompletionItem containing node configs.
   */
  private getNodeConfigCompletionItems(
    schemaType: string,
    nodeType: string,
    nodeName: string,
    presentConfigs: string[]
  ): CompletionItem[] {
    type SchemaType = keyof typeof this.schemaService.schemaConfigs;
    const schemaTypeKey = schemaType as SchemaType;
    const items: CompletionItem[] = [];
    this.schemaService.schemaConfigs[schemaTypeKey].schema
      .get(nodeType)
      ?.get(nodeName)
      ?.configs.forEach((config) => {
        if (!presentConfigs.includes(config)) {
          items.push({
            label: config,
            kind: CompletionItemKind.Class,
            data:
              schemaType === "builtIn"
                ? CompletionItemData.BuiltInConfig
                : CompletionItemData.CustomConfig,
          });
        }
      });
    return items;
  }

  /**
   * Creates a completion item containing a snippet of all of the node configs.
   *
   * @param schemaType Type of schema: builtIn or custom.
   * @param nodeType Type of node.
   * @param nodeName Name of node.
   * @param prefix The string to be prepended to each config entry when forming
   *               the snippet.
   * @param suffix The string to be appended to each config entry when forming
   *               the snippet.
   * @returns A tuple containing a boolean flag and a CompletionItem. If flag
   *          is true, the completion item contains a snippet of all of the
   *          node configs. If false, the completion item is empty.
   */
  private getNodeConfigSnippet(
    schemaType: string,
    nodeType: string,
    nodeName: string,
    prefix: string,
    suffix: string
  ): [boolean, CompletionItem] {
    type SchemaType = keyof typeof this.schemaService.schemaConfigs;
    const schemaTypeKey = schemaType as SchemaType;
    const configs = this.schemaService.schemaConfigs[schemaTypeKey].schema
      .get(nodeType)
      ?.get(nodeName)?.configs;
    if (configs !== undefined && configs.length > 0) {
      const completionText = prefix + configs.join(suffix + prefix) + suffix;
      return [
        true,
        {
          label: "Configuration options",
          kind: CompletionItemKind.TypeParameter,
          data:
            schemaType === "builtIn"
              ? CompletionItemData.BuiltInConfig
              : CompletionItemData.CustomConfig,
          insertTextMode: InsertTextMode.asIs,
          insertText: completionText,
        },
      ];
    } else {
      return [false, {} as CompletionItem];
    }
  }

  /**
   *  Creates an array of node name completion items.
   *
   * @param schemaType Type of schema: builtIn or custom.
   * @param nodeType Type of node.
   * @returns An array of CompletionItem containing either built-in or custom
   *          node names.
   */
  private getNodeNameCompletionItems(
    schemaType: string,
    nodeType: string
  ): CompletionItem[] {
    type SchemaType = keyof typeof this.schemaService.schemaConfigs;
    const schemaTypeKey = schemaType as SchemaType;
    const items: CompletionItem[] = [];
    this.schemaService.schemaConfigs[schemaTypeKey].schema
      .get(nodeType)
      ?.forEach((_value, key) => {
        items.push({
          label: key,
          kind: CompletionItemKind.Class,
          data:
            schemaType === "builtIn"
              ? CompletionItemData.BuiltInNode
              : CompletionItemData.CustomNode,
        });
      });
    return items;
  }

  /**
   *  Creates an array of node type completion items.
   *
   * @param schemaType Type of schema: builtIn or custom.
   * @returns An array of CompletionItem containing either built-in or custom
   *          node types.
   */
  private getNodeTypeCompletionItems(schemaType: string): CompletionItem[] {
    type SchemaType = keyof typeof this.schemaService.schemaConfigs;
    const schemaTypeKey = schemaType as SchemaType;
    const items = [];
    for (const key of this.schemaService.schemaConfigs[
      schemaTypeKey
    ].schema.keys()) {
      items.push({
        label: key,
        kind: CompletionItemKind.TypeParameter,
        data:
          schemaType === "builtIn"
            ? CompletionItemData.BuiltInType
            : CompletionItemData.CustomType,
      });
    }
    return items;
  }

  /**
   * Returns the character before the completion trigger character.
   *
   * @param textDocument Currently open text document.
   * @param params Auto-completion parameters containing current
   *                         cursor location.
   * @returns The character before the trigger character.
   */
  private getPrecedingChar(
    textDocument: TextDocument,
    params: CompletionParams
  ): string {
    const position = params.position;
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
   * @param params Auto-completion parameters containing current
   *                         cursor location.
   * @param trim Flag to determine if the whitespaces should be removed.
   * @returns The line before the trigger character.
   */
  private getPrecedingText(
    textDocument: TextDocument,
    params: CompletionParams,
    trim = true
  ): string {
    const position = params.position;
    const precedingText = textDocument.getText({
      start: { line: position.line, character: 0 },
      end: { line: position.line, character: position.character - 1 },
    });
    return trim ? precedingText.trim() : precedingText;
  }
}
