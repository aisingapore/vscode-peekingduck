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
import { TextDocument } from "vscode-languageserver-textdocument";
import { ParsedItem, Range } from "../pkd_types";

/**
 * A parsed pipeline entry, can one of the following three types:
 * - nodeString: The entry is a string
 * - nodeMap: The entry is a key-value map
 * - nonNode: Other types, e.g., number, array, that do not fit the above two
 *            types
 */
export interface NodeEntry {
  nodeString?: ParsedItem;
  nodeMap?: {
    nodeString: ParsedItem;
    nodeConfigs: ParsedItem[];
  };
  nonNode?: ParsedItem;
}

interface ParsedPipeline {
  nodes: NodeEntry[];
}

// Error code for PeekingDuck pipeline file grammar errors.
const errorCode: yaml.ErrorCode = "IMPOSSIBLE";
// Default character offset range when parsing the actual range fails.
const defaultRange = { start: 0, end: 1 };

/** Parser class for PeekingDuck pipeline YAML files. */
export class PkdParser {
  /**
   * Parses the specified YAML document to a pipeline of nodes.
   *
   * @param textDocument A TextDocument object containing the pipeline file to
   *                     be parsed.
   * @param omitLine The line to be omitted. This is used when `parse()` is
   *                 called via invoked completion. The
   * @returns A ParsedPipeline object with a `node` key pointing to a list of
   *          parsed NodeEntry's.
   */
  parse(textDocument: TextDocument, omitLine = -1): ParsedPipeline {
    const text = this.omitLineFromText(textDocument, omitLine);
    const doc = yaml.parseDocument(text, { prettyErrors: false });

    if (doc.errors.length) throw doc.errors[0];
    const entries = this.getPipelineEntries(doc);

    const nodes: NodeEntry[] = [];
    for (const entry of entries) {
      if (isYAMLString(entry)) {
        nodes.push(NodeFactory.makeNodeString(entry));
      } else if (yaml.isMap(entry)) {
        if (entry.items.length > 1) {
          throw new yaml.YAMLParseError(
            getKeyRangeTuple(entry.items[1]),
            errorCode,
            "Each entry should only contain a single node."
          );
        }
        if (isYAMLString(entry.items[0].key)) {
          nodes.push(NodeFactory.makeNodeMap(entry.items[0]));
        } else {
          nodes.push(NodeFactory.makeNonNode(entry.items[0].key));
        }
      } else {
        nodes.push(NodeFactory.makeNonNode(entry));
      }
    }

    return { nodes: nodes };
  }

  parseNodeDefMap(
    textDocument: TextDocument,
    omitLine: number
  ): Map<number, NodeEntry> {
    const nodeDefMap = new Map();
    const pipeline = this.parse(textDocument, omitLine);
    pipeline.nodes.forEach((entry: NodeEntry) => {
      if (entry.nodeString !== undefined) {
        const position = textDocument.positionAt(entry.nodeString.range.start);
        nodeDefMap.set(position.line, entry.nodeString);
      } else if (entry.nodeMap !== undefined) {
        const position = textDocument.positionAt(
          entry.nodeMap.nodeString.range.start
        );
        nodeDefMap.set(position.line, entry);
      }
    });
    return nodeDefMap;
  }

  /**
   * Returns the pipeline items further processing.
   *
   * @param doc Parsed YAML document object.
   * @returns An array of YAML nodes found under the top-level `node` key.
   * @throws {yaml.YAMLParseError} `doc.contents` is `null`, `doc.contents` is
   *                               not a key-value map, or the top-level key is
   *                               not "nodes".
   * @throws {yaml.YAMLParseError} `doc.contents` is a key-value map with more
   *                               than one entry.
   * @throws {yaml.YAMLParseError} The top-level "nodes" key does not map to an
   *                               array of nodes.
   */
  private getPipelineEntries(
    doc: yaml.Document.Parsed<yaml.ParsedNode>
  ): yaml.ParsedNode[] {
    const contents = doc.contents;
    if (
      contents === null ||
      !yaml.isMap(contents) ||
      !contents.items.length ||
      !yaml.isScalar(contents.items[0].key) ||
      contents.items[0].key.value !== "nodes"
    ) {
      throw makeDefaultError("Top level 'nodes' key not found");
    }
    const pipelineMap = contents.items;
    if (pipelineMap.length > 1) {
      throw new yaml.YAMLParseError(
        getKeyRangeTuple(pipelineMap[1]),
        errorCode,
        "Pipeline should only contain a single top level 'nodes' key."
      );
    }
    const nodeSection = pipelineMap[0];
    if (!yaml.isSeq(nodeSection.value) || !nodeSection.value.items.length) {
      throw new yaml.YAMLParseError(
        getKeyRangeTuple(nodeSection),
        errorCode,
        "Pipeline does not contain a list of nodes."
      );
    }
    return nodeSection.value.items;
  }

  /**
   * Replace the specified `line` with white spaces (excluding the final new
   * line).
   *
   * @param textDocument A TextDocument object containing the pipeline file to
   *                     be parsed.
   * @param line The line number to be omitted if any.
   * @returns The document's text with the specified line replaced with white
   *          spaces.
   */
  private omitLineFromText(textDocument: TextDocument, line: number): string {
    let text = textDocument.getText();
    if (line > -1) {
      const start = textDocument.offsetAt({ line, character: 0 });
      const end = textDocument.offsetAt({ line: line + 1, character: 0 }) - 1;
      text =
        text.substring(0, start) +
        " ".repeat(end - start) +
        text.substring(end);
    }
    return text;
  }
}

/**
 * Returns character offsets range of the specified key-value Pair.
 *
 * @param pair A key-value Pair.
 * @returns A Range object containing [start: start, end: value-end]. If the
 *          key or key.range is undefined, returns `defaultRange`.
 */
function getKeyRange(pair: yaml.Pair): Range {
  const range = yaml.isNode(pair.key) ? pair.key.range : null;
  return range !== null && range !== undefined
    ? { start: range[0], end: range[1] }
    : defaultRange;
}

/**
 * Returns character offsets range of the specified key-value Pair.
 *
 * @param pair A key-value Pair.
 * @returns A 2 element tuple containing [start, value-end]. If the key or
 *          key.range is undefined, returns `defaultRange`.
 */
function getKeyRangeTuple(pair: yaml.Pair): [number, number] {
  const range = getKeyRange(pair);
  return [range.start, range.end];
}

/**
 * Checks if the `value` is a yaml.Scalar of "string" type.
 *
 * @param value The value to be checked.
 * @returns `true` if the `value` is a yaml.Scalar of "string" type.
 */
function isYAMLString(value: unknown): value is yaml.Scalar<string> {
  return yaml.isScalar(value) && typeof value.value === "string";
}

/**
 * Returns a yaml.YAMLParseError with the default character offsets as its
 * position.
 *
 * @param message Error message
 * @returns A yaml.YAMLParseError with the default character offsets as its
 *          position
 */
function makeDefaultError(message: string): yaml.YAMLParseError {
  return new yaml.YAMLParseError(
    [defaultRange.start, defaultRange.end],
    errorCode,
    message
  );
}

class NodeFactory {
  /**
   * Parses the specified pipeline entry into a node map.
   *
   * @param entry The specified pipeline entry.
   * @returns A NodeEntry object with the parsed entry in the `nodeMap` key.
   * @throws {yaml.YAMLParseError} The key of the node config is not a Scalar
   *                               or Seq.
   * @throws {yaml.YAMLParseError} The range of the node config's key cannot be
   *                               parsed.
   */
  static makeNodeMap(entry: yaml.Pair): NodeEntry {
    const nodeValue = entry.value;
    const nodeConfigs: ParsedItem[] = [];
    if (yaml.isMap(nodeValue)) {
      for (const config of nodeValue.items) {
        if (!yaml.isScalar(config.key) && !yaml.isSeq(config.key)) {
          throw makeDefaultError("Error parsing node entry.");
        }
        /* istanbul ignore if */
        if (config.key.range === null || config.key.range === undefined) {
          throw makeDefaultError("Error parsing node config.");
        }
        nodeConfigs.push({
          value: "value" in config.key ? config.key.value : undefined,
          range: getKeyRange(config),
        });
      }
    }
    // entry.key is guaranteed to be yaml.Scalar<string> by the caller
    const value = (entry.key as yaml.Scalar<string>).value;
    const range = getKeyRange(entry);
    return { nodeMap: { nodeString: { value, range }, nodeConfigs } };
  }

  /**
   * Parses the specified pipeline entry into a node string.
   *
   * @param entry The specified pipeline entry.
   * @returns A NodeEntry object with the parsed entry in the `nodeString` key.
   * @throws {yaml.YAMLParseError} The range of the entry could not be parsed.
   */
  static makeNodeString(entry: yaml.Scalar<string>): NodeEntry {
    /* istanbul ignore if */
    if (entry.range === null || entry.range === undefined) {
      throw makeDefaultError("Error parsing scalar entry.");
    }
    const value = entry.value;
    const range = { start: entry.range[0], end: entry.range[1] };
    return { nodeString: { value, range } };
  }

  /**
   * Parses the specified pipeline entry into a non-node entry.
   *
   * @param entry The specified pipeline entry.
   * @returns A NodeEntry object with the parsed entry in the `nonNode` key.
   */
  static makeNonNode(entry: yaml.ParsedNode): NodeEntry {
    const value = "value" in entry ? entry.value : undefined;
    const range = { start: entry.range[0], end: entry.range[1] };
    return { nonNode: { value, range } };
  }
}
