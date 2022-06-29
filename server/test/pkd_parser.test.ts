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
      .with.deep.property("pos", [
        textDocument.offsetAt({ line: 2, character: 0 }),
        textDocument.offsetAt({ line: 2, character: 7 }),
      ]);
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
      .with.deep.property("pos", [
        textDocument.offsetAt({ line: 3, character: 4 }),
        textDocument.offsetAt({ line: 3, character: 17 }),
      ]);
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
    const rangeAt = (
      startLine: number,
      startCharacter: number,
      endLine: number,
      endCharacter: number
    ) => {
      return {
        start: textDocument.offsetAt({
          line: startLine,
          character: startCharacter,
        }),
        end: textDocument.offsetAt({ line: endLine, character: endCharacter }),
      };
    };

    const nodes: NodeEntry[] = [
      {
        nodeString: { value: "input.visual", range: rangeAt(1, 4, 1, 16) },
      },
      {
        nodeMap: {
          nodeString: { value: "model.yolo", range: rangeAt(2, 4, 2, 14) },
          nodeConfigs: [
            { value: "iou_threshold", range: rangeAt(3, 6, 3, 19) },
            { value: "score_threshold", range: rangeAt(4, 6, 4, 21) },
          ],
        },
      },
      {
        nodeMap: {
          nodeString: { value: "model.posenet", range: rangeAt(5, 4, 5, 17) },
          nodeConfigs: [],
        },
      },
      { nonNode: { value: undefined, range: rangeAt(6, 4, 6, 25) } },
      { nonNode: { value: 1234, range: rangeAt(8, 4, 8, 8) } },
      { nonNode: { value: undefined, range: rangeAt(10, 4, 10, 30) } },
      { nonNode: { value: 5678, range: rangeAt(11, 4, 11, 8) } },
      {
        nodeMap: {
          nodeString: {
            value: "dabble.statistics",
            range: rangeAt(12, 4, 12, 21),
          },
          nodeConfigs: [{ value: undefined, range: rangeAt(13, 6, 13, 11) }],
        },
      },
    ];
    const expectedPipeline = { nodes };

    expect(parser.parse(textDocument)).to.be.deep.equal(expectedPipeline);
  });
});
