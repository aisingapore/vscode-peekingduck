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

import * as chai from "chai";
import * as yaml from "yaml";
import {
  NodeEntry,
  PkdParser,
} from "../src/language_service/parsers/pkd_parser";
import { pipelineFiles as files } from "./utils/expected";
import { createTextDocument } from "./utils/helper";

const expect = chai.expect;

describe("PKD Pipeline Parser", () => {
  it("should throw for invalid YAML documents", () => {
    const textDocument = createTextDocument(files.invalid);
    const parser = new PkdParser();

    expect(() => parser.parse(textDocument)).to.throw(yaml.YAMLParseError);
  });

  it("should throw for missing top-level 'nodes' key", () => {
    const textDocument = createTextDocument(files.missingNodesKey);
    const parser = new PkdParser();

    expect(() => parser.parse(textDocument))
      .to.throw(yaml.YAMLParseError, "Top level 'nodes' key not found")
      .with.deep.property("pos", [0, 1]);
  });

  it("should throw for multiple top-level keys", () => {
    const textDocument = createTextDocument(files.multipleTopKeys);
    const parser = new PkdParser();

    expect(() => parser.parse(textDocument))
      .to.throw(
        yaml.YAMLParseError,
        "Pipeline should only contain a single top level 'nodes' key"
      )
      .with.deep.property("pos", [15, 22]);
  });

  it("should throw for empty node list", () => {
    const textDocument = createTextDocument(files.emptyNodeList);
    const parser = new PkdParser();

    expect(() => parser.parse(textDocument))
      .to.throw(
        yaml.YAMLParseError,
        "Pipeline does not contain a list of nodes."
      )
      .with.deep.property("pos", [0, 5]);
  });

  it("should throw for multiple node entry", () => {
    const textDocument = createTextDocument(files.multipleNodeEntry);
    const parser = new PkdParser();

    expect(() => parser.parse(textDocument))
      .to.throw(
        yaml.YAMLParseError,
        "Each entry should only contain a single node."
      )
      .with.deep.property("pos", [49, 62]);
  });

  it("should throw for invalid config key", () => {
    const textDocument = createTextDocument(files.invalidConfigKey);
    const parser = new PkdParser();

    expect(() => parser.parse(textDocument))
      .to.throw(yaml.YAMLParseError, "Error parsing node entry.")
      .with.deep.property("pos", [0, 1]);
  });

  it("should parse valid pipeline file", () => {
    const textDocument = createTextDocument(files.valid);
    const parser = new PkdParser();

    const nodes: NodeEntry[] = [
      { nodeString: { value: "input.visual", range: { start: 11, end: 23 } } },
      {
        nodeMap: {
          nodeString: { value: "model.yolo", range: { start: 28, end: 38 } },
          nodeConfigs: [
            { value: "iou_threshold", range: { start: 46, end: 59 } },
            { value: "score_threshold", range: { start: 71, end: 86 } },
          ],
        },
      },
      {
        nodeMap: {
          nodeString: {
            value: "model.posenet",
            range: { start: 96, end: 109 },
          },
          nodeConfigs: [],
        },
      },
      { nonNode: { value: undefined, range: { start: 115, end: 136 } } },
      { nonNode: { value: 1234, range: { start: 157, end: 161 } } },
      { nonNode: { value: undefined, range: { start: 182, end: 208 } } },
      { nonNode: { value: 5678, range: { start: 213, end: 217 } } },
      {
        nodeMap: {
          nodeString: {
            value: "dabble.statistics",
            range: { start: 222, end: 239 },
          },
          nodeConfigs: [{ value: undefined, range: { start: 247, end: 252 } }],
        },
      },
    ];
    const expectedPipeline = { nodes };

    expect(parser.parse(textDocument)).to.be.deep.equal(expectedPipeline);
  });
});
