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

import * as yaml from "yaml";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { PkdParser } from "../parsers/pkd_parser";
import { LanguageSettings } from "../pkd_language_service";
import { ParsedItem, Range } from "../pkd_types";
import { PkdSchemaService } from "./pkd_schema_service";

interface ValidationResult {
  ok: boolean;
  diagnostics: PkdDiagnostic[];
}

/**
 * Overrides the VSCode Diagnostic interface with character offset range to
 * avoid repeated conversions.
 */
interface PkdDiagnostic extends Omit<Diagnostic, "range"> {
  range: Range;
}

export class PkdValidation {
  private readonly id: string;
  private shouldValidate!: {
    builtIn: boolean;
    custom: boolean;
  };
  private maxProblems!: number;
  private schemaService: PkdSchemaService;

  /** Pipeline parser, to parse pipeline files such as `pipeline_config.yml` */
  private parser: PkdParser;

  constructor(schemaService: PkdSchemaService, id: string) {
    this.schemaService = schemaService;
    this.id = id;
    this.parser = new PkdParser();
  }

  configure(settings: LanguageSettings): void {
    this.shouldValidate = settings.validate;
    this.maxProblems = settings.maxProblems;
  }

  async doValidation(textDocument: TextDocument): Promise<Diagnostic[]> {
    if (!this.shouldValidate.builtIn && !this.shouldValidate.custom) return [];

    console.log(`Analyzing ${textDocument.uri}`);
    const diagnostics: PkdDiagnostic[] = [];
    try {
      const pipeline = this.parser.parse(textDocument);
      console.log(pipeline);
      for (const entry of pipeline.nodes) {
        if (diagnostics.length >= this.maxProblems) break;
        if (entry.nodeString !== undefined) {
          const nodeParts = entry.nodeString.value.split(".");
          const result = this.validateNodeString(
            nodeParts,
            entry.nodeString.range
          );
          if (!result.ok) diagnostics.push(...result.diagnostics);
        } else if (entry.nodeMap !== undefined) {
          const nodeParts = entry.nodeMap.nodeString.value.split(".");
          const result = this.validateNodeString(
            nodeParts,
            entry.nodeMap.nodeString.range
          );
          if (!result.ok) {
            diagnostics.push(...result.diagnostics);
            continue;
          }
          const pkdDiagnostics = this.validateNodeConfig(
            nodeParts,
            entry.nodeMap.nodeString,
            entry.nodeMap.nodeConfigs
          );
          diagnostics.push(...pkdDiagnostics);
        } else if (entry.nonNode !== undefined) {
          diagnostics.push(
            this.makePkdDiagnostic(entry.nonNode.range, "Not a node.")
          );
        }
      }
    } catch (exc) {
      if (exc instanceof yaml.YAMLParseError) {
        const range = { start: exc.pos[0], end: exc.pos[1] };
        diagnostics.push(this.makePkdDiagnostic(range, exc.message));
      }
    }
    return this.convertToDiagnostic(diagnostics, textDocument);
  }

  /**
   * Checks if the PeekingDuck node definition is valid.
   *
   * @param nodeParts An array containing the nodeType and nodeName parts of
   *                  the node definition.
   * @param range The start and end positions of the node definition.
   * @returns `true` is the node definition is valid, `false` otherwise.
   */
  private checkBuiltInNode(
    nodeParts: string[],
    range: Range
  ): ValidationResult {
    const [nodeType, nodeName] = nodeParts;
    const schema = this.schemaService.schemaConfigs.builtIn.schema;
    if (!schema.has(nodeType)) {
      const start = range.start;
      const end = start + nodeType.length;
      return {
        ok: false,
        diagnostics: [
          this.makePkdDiagnostic(
            { start, end },
            `${nodeType} is not a valid PeekingDuck node type.`
          ),
        ],
      };
    }
    if (!schema.get(nodeType)?.has(nodeName)) {
      const end = range.end;
      const start = end - nodeName.length;
      return {
        ok: false,
        diagnostics: [
          this.makePkdDiagnostic(
            { start, end },
            `${nodeName} is not a valid PeekingDuck ${nodeType} node.`
          ),
        ],
      };
    }
    return { ok: true, diagnostics: [] };
  }

  /**
   * Checks if the PeekingDuck node configs are valid.
   *
   * @param nodeParts An array containing the nodeType and nodeName parts of
   *                  the node definition.
   * @param nodeConfigs An array of parsed node config keys and their start
   *                    and end positions.
   */
  private checkBuiltInNodeConfig(
    nodeParts: string[],
    nodeConfigs: ParsedItem[]
  ): PkdDiagnostic[] {
    const [nodeType, nodeName] = nodeParts;
    const schema = this.schemaService.schemaConfigs.builtIn.schema;

    const diagnostics: PkdDiagnostic[] = [];
    for (const config of nodeConfigs) {
      if (
        !schema.get(nodeType)?.get(nodeName)?.configs.includes(config.value)
      ) {
        diagnostics.push(
          this.makePkdDiagnostic(config.range, "Invalid node config key.")
        );
      }
    }
    return diagnostics;
  }

  /**
   * Checks if the custom node definition is valid.
   *
   * @param nodeParts An array containing the folderName, nodeType, and
   *                  nodeName parts of the node definition.
   * @param range The start and end positions of the node definition.
   * @returns `true` is the node definition is valid, `false` otherwise.
   */
  private checkCustomNode(nodeParts: string[], range: Range): ValidationResult {
    const [folderName, nodeType, nodeName] = nodeParts;
    const customFolderName = this.schemaService.schemaConfigs.custom.name;
    const schema = this.schemaService.schemaConfigs.custom.schema;
    if (folderName !== customFolderName) {
      const start = range.start;
      const end = start + folderName.length;
      return {
        ok: false,
        diagnostics: [
          this.makePkdDiagnostic(
            { start, end },
            `${folderName} is not a valid custom nodes folder.`
          ),
        ],
      };
    }
    if (!schema.has(nodeType)) {
      const start = range.start + folderName.length + 1;
      const end = start + nodeType.length;
      return {
        ok: false,
        diagnostics: [
          this.makePkdDiagnostic(
            { start, end },
            `${nodeType} is not a valid custom node type.`
          ),
        ],
      };
    }
    if (!schema.get(nodeType)?.has(nodeName)) {
      const end = range.end;
      const start = end - nodeName.length;
      return {
        ok: false,
        diagnostics: [
          this.makePkdDiagnostic(
            { start, end },
            `${nodeName} is not a valid custom ${nodeType} node.`
          ),
        ],
      };
    }
    return { ok: true, diagnostics: [] };
  }

  /**
   * Checks if the custom node configs are valid.
   *
   * @param nodeParts An array containing the folderName (unused), nodeType,
   *                  and nodeName parts of the node definition.
   * @param nodeConfigs An array of parsed node config keys and their start
   *                    and end positions.
   */
  private checkCustomNodeConfig(
    nodeParts: string[],
    nodeConfigs: ParsedItem[]
    // textDocument: TextDocument
    // diagnostics: Diagnostic[]
  ): PkdDiagnostic[] {
    const [, nodeType, nodeName] = nodeParts;
    const schema = this.schemaService.schemaConfigs.custom.schema;

    const diagnostics: PkdDiagnostic[] = [];
    for (const config of nodeConfigs) {
      if (
        !schema.get(nodeType)?.get(nodeName)?.configs.includes(config.value)
      ) {
        diagnostics.push(
          this.makePkdDiagnostic(config.range, "Invalid node config key.")
        );
      }
    }
    return diagnostics;
  }

  /**
   * Converts from PkdDiagnostic which uses character offest for range to
   * VSCode Diagnostic which uses line and character for range.
   *
   * @param diagnostics An array of PkdDiagnostic's.
   * @param textDocument A TextDocument object containing the pipeline file
   *                     being analyzed.
   * @returns An array of VSCode Diagnostic's.
   */
  private convertToDiagnostic(
    diagnostics: PkdDiagnostic[],
    textDocument: TextDocument
  ): Diagnostic[] {
    return diagnostics.map((diagnostic) => {
      return {
        severity: diagnostic.severity,
        range: {
          start: textDocument.positionAt(diagnostic.range.start),
          end: textDocument.positionAt(diagnostic.range.end),
        },
        message: diagnostic.message,
        source: diagnostic.source,
      };
    });
  }

  /**
   * Create a PkdDiagnostic object with the severity=Error and
   * source=`this.id`.
   *
   * @param range Start and end position of the invalid text.
   * @param message Diagnostic message.
   *
   * @returns A PkdDiagnostic object
   */
  private makePkdDiagnostic(range: Range, message: string): PkdDiagnostic {
    return {
      severity: DiagnosticSeverity.Error,
      range,
      message,
      source: this.id,
    };
  }

  /**
   * Checks if the node configs are is valid.
   *
   * @param nodeParts An array containing the parts of the node definition. For
   *                  PeekingDuck nodes, nodeParts = [nodeType, nodeName]. For
   *                  custom nodes, nodeParts = [folderName, nodeType,
   *                  nodeName].
   * @param nodeString The node definition and its start and end positions.
   * @param nodeConfigs Any array of the node configs.
   * @returns An array of PkdDiagnostic's.
   */
  private validateNodeConfig(
    nodeParts: string[],
    nodeString: ParsedItem,
    nodeConfigs: ParsedItem[]
  ): PkdDiagnostic[] {
    if (nodeConfigs.length === 0) {
      return [
        this.makePkdDiagnostic(nodeString.range, "Missing node configs."),
      ];
    }
    if (nodeParts.length === 2) {
      return this.checkBuiltInNodeConfig(nodeParts, nodeConfigs);
    }
    if (nodeParts.length === 3) {
      return this.checkCustomNodeConfig(nodeParts, nodeConfigs);
    }
    return [];
  }

  /**
   * Checks if the node definition is valid.
   *
   * @param nodeParts An array containing the parts of the node definition. For
   *                  PeekingDuck nodes, nodeParts = [nodeType, nodeName]. For
   *                  custom nodes, nodeParts = [folderName, nodeType,
   *                  nodeName].
   * @param range The start and end positions of the node definition.
   * @returns `true` is the node definition is valid, `false` otherwise.
   */
  private validateNodeString(
    nodeParts: string[],
    range: Range
  ): ValidationResult {
    if (nodeParts.length === 2) {
      return this.shouldValidate.builtIn
        ? this.checkBuiltInNode(nodeParts, range)
        : { ok: false, diagnostics: [] };
    } else if (nodeParts.length === 3) {
      return this.shouldValidate.custom
        ? this.checkCustomNode(nodeParts, range)
        : { ok: false, diagnostics: [] };
    } else {
      return {
        ok: false,
        diagnostics: [
          this.makePkdDiagnostic(range, "Poorly formatted node definition."),
        ],
      };
    }
  }
}
