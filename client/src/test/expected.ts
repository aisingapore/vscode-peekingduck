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

import { CompletionItemKind } from "vscode";

import { createExpectedError, getDocUri } from "./helper";

export const id = "peekingduck";

const builtInNode = { kind: CompletionItemKind.Class, data: 1 };
const builtInType = { kind: CompletionItemKind.TypeParameter, data: 0 };
const customNode = { kind: CompletionItemKind.Class, data: 5 };
const customType = { kind: CompletionItemKind.TypeParameter, data: 4 };

export const completions = {
  builtIn: {
    name: {
      dabble: {
        bboxCount: { label: "bbox_count", ...builtInNode },
        fps: { label: "fps", ...builtInNode },
      },
      model: {
        yolo: { label: "yolo", ...builtInNode },
      },
    },
    type: {
      dabble: { label: "dabble", ...builtInType },
      model: { label: "model", ...builtInType },
    },
  },
  custom: {
    folder: { label: "custom_nodes", kind: CompletionItemKind.Module, data: 3 },
    name: {
      dabble: {
        bbox_count: { label: "my_dabble_node", ...customNode },
      },
      model: {
        myModelNode: { label: "my_model_node", ...customNode },
        yolo: { label: "yolo", ...customNode },
      },
    },
    type: {
      myDabble: { label: "my_dabble", ...customType },
      model: { label: "model", ...customType },
    },
  },
};

export const pipelineFiles = {
  bad: getDocUri("./pipelines/bad_pipeline.yml"),
  completion: getDocUri("./pipelines/completion_pipeline.yml"),
  emptyNodeList: getDocUri("./pipelines/empty_node_list_pipeline.yml"),
  good: getDocUri("./pipelines/good_pipeline.yml"),
  invalid: getDocUri("./pipelines/invalid_pipeline.yml"),
  invalidConfigKey: getDocUri("./pipelines/invalid_config_key_pipeline.yml"),
  missingNodesKey: getDocUri("./pipelines/missing_nodes_key_pipeline.yml"),
  multipleNodeEntry: getDocUri("./pipelines/multiple_node_entry_pipeline.yml"),
  multipleTopKeys: getDocUri("./pipelines/multiple_top_keys_pipeline.yml"),
  valid: getDocUri("./pipelines/valid_pipeline.yml"),
};

export const validationErrors = {
  builtIn: [
    createExpectedError(
      { line: 1, character: 4 },
      { line: 1, character: 11 },
      "augment is not a valid PeekingDuck node type.",
      id
    ),
    createExpectedError(
      { line: 2, character: 11 },
      { line: 2, character: 21 },
      "zone_count is not a valid PeekingDuck dabble node.",
      id
    ),
    createExpectedError(
      { line: 3, character: 4 },
      { line: 3, character: 11 },
      "augment is not a valid PeekingDuck node type.",
      id
    ),
    createExpectedError(
      { line: 5, character: 11 },
      { line: 5, character: 21 },
      "zone_count is not a valid PeekingDuck dabble node.",
      id
    ),
    createExpectedError(
      { line: 8, character: 6 },
      { line: 8, character: 14 },
      "Invalid node config key.",
      id
    ),
    createExpectedError(
      { line: 10, character: 4 },
      { line: 10, character: 21 },
      "Missing node configs.",
      id
    ),
  ],
  custom: [
    createExpectedError(
      { line: 23, character: 4 },
      { line: 23, character: 10 },
      "custom is not a valid custom nodes folder.",
      id
    ),
    createExpectedError(
      { line: 24, character: 17 },
      { line: 24, character: 22 },
      "input is not a valid custom node type.",
      id
    ),
    createExpectedError(
      { line: 25, character: 27 },
      { line: 25, character: 37 },
      "bbox_count is not a valid custom my_dabble node.",
      id
    ),
    createExpectedError(
      { line: 26, character: 4 },
      { line: 26, character: 10 },
      "custom is not a valid custom nodes folder.",
      id
    ),
    createExpectedError(
      { line: 28, character: 17 },
      { line: 28, character: 22 },
      "input is not a valid custom node type.",
      id
    ),
    createExpectedError(
      { line: 30, character: 27 },
      { line: 30, character: 37 },
      "zone_count is not a valid custom my_dabble node.",
      id
    ),
    createExpectedError(
      { line: 34, character: 6 },
      { line: 34, character: 16 },
      "Invalid node config key.",
      id
    ),
    createExpectedError(
      { line: 35, character: 4 },
      { line: 35, character: 36 },
      "Missing node configs.",
      id
    ),
  ],
  general: [
    createExpectedError(
      { line: 11, character: 4 },
      { line: 11, character: 11 },
      "Poorly formatted node definition.",
      id
    ),
    createExpectedError(
      { line: 12, character: 4 },
      { line: 12, character: 11 },
      "Poorly formatted node definition.",
      id
    ),
    createExpectedError(
      { line: 14, character: 4 },
      { line: 14, character: 8 },
      "Not a node.",
      id
    ),
    createExpectedError(
      { line: 15, character: 4 },
      { line: 15, character: 8 },
      "Not a node.",
      id
    ),
    createExpectedError(
      { line: 17, character: 6 },
      { line: 17, character: 10 },
      "Poorly formatted node definition.",
      id
    ),
    createExpectedError(
      { line: 18, character: 4 },
      { line: 18, character: 12 },
      "Not a node.",
      id
    ),
    createExpectedError(
      { line: 20, character: 4 },
      { line: 20, character: 16 },
      "Not a node.",
      id
    ),
    createExpectedError(
      { line: 21, character: 4 },
      { line: 21, character: 16 },
      "Not a node.",
      id
    ),
  ],
};
