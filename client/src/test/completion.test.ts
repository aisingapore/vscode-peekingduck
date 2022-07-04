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
import * as vscode from "vscode";
import { completions, pipelineFiles as files } from "./expected";
import { activate, configure } from "./helper";

const expect = chai.expect;

describe("E2E completion", () => {
  const docUri = files.completion;

  it("should provide custom folder and built-in node type completions on space", async () => {
    await activate(docUri);
    await configure(true, true);

    await testCompletion(docUri, new vscode.Position(2, 4), " ", {
      items: [
        completions.custom.folder,
        completions.builtIn.type.dabble,
        completions.builtIn.type.model,
      ],
    });
  });

  it("should provide only custom folder completions on space", async () => {
    await activate(docUri);
    await configure(false, true);

    await testCompletion(docUri, new vscode.Position(2, 4), " ", {
      items: [completions.custom.folder],
    });
  });

  it("should provide only built-in node type completions on space", async () => {
    await activate(docUri);
    await configure(true, false);

    await testCompletion(docUri, new vscode.Position(2, 4), " ", {
      items: [completions.builtIn.type.dabble, completions.builtIn.type.model],
    });
  });

  it("should provide built-in node name completion on period", async () => {
    await activate(docUri);
    await configure(true, true);

    await testCompletion(docUri, new vscode.Position(4, 11), ".", {
      items: [
        completions.builtIn.name.dabble.bboxCount,
        completions.builtIn.name.dabble.fps,
      ],
    });
  });

  it("should provide custom node type completion on period", async () => {
    await activate(docUri);
    await configure(true, true);

    await testCompletion(docUri, new vscode.Position(6, 17), ".", {
      items: [completions.custom.type.model, completions.custom.type.myDabble],
    });
  });

  it("should provide custom node name completion on period", async () => {
    await activate(docUri);
    await configure(true, true);

    await testCompletion(docUri, new vscode.Position(8, 23), ".", {
      items: [
        completions.custom.name.model.myModelNode,
        completions.custom.name.model.yolo,
      ],
    });
  });

  it("should provide built-in node configs completion on colon", async () => {
    await activate(docUri);
    await configure(true, true);

    const prefix = "\n      ";
    const suffix = ":";
    // data and insertTextMode are missing in vscode's CompletionItem definition
    await testCompletion(docUri, new vscode.Position(10, 15), ":", {
      items: [
        {
          label: "Configuration options",
          kind: vscode.CompletionItemKind.TypeParameter,
          insertText:
            prefix +
            ["fps_log_display", "fps_log_freq", "dampen_fps"].join(
              suffix + prefix
            ) +
            suffix,
        },
      ],
    });
  });

  it("should provide custom node configs completion on colon", async () => {
    await activate(docUri);
    await configure(true, true);

    const prefix = "\n      ";
    const suffix = ":";
    // data and insertTextMode are missing in vscode's CompletionItem definition
    await testCompletion(docUri, new vscode.Position(12, 37), ":", {
      items: [
        {
          label: "Configuration options",
          kind: vscode.CompletionItemKind.TypeParameter,
          insertText: prefix + ["model_conf_1"].join(suffix + prefix) + suffix,
        },
      ],
    });
  });

  it("should not provide completions for invalid custom node folder, node types, and node names", async () => {
    await activate(docUri);
    await configure(true, true);

    await testCompletion(docUri, new vscode.Position(14, 12), ".", {
      items: [],
    });
    await testCompletion(docUri, new vscode.Position(16, 11), ".", {
      items: [],
    });
    await testCompletion(docUri, new vscode.Position(18, 23), ".", {
      items: [],
    });
    await testCompletion(docUri, new vscode.Position(20, 23), ":", {
      items: [],
    });
    await testCompletion(docUri, new vscode.Position(22, 30), ":", {
      items: [],
    });
    await testCompletion(docUri, new vscode.Position(24, 21), ".", {
      items: [],
    });
  });

  it("should not provide built-in completions when disabled", async () => {
    await activate(docUri);
    await configure(false, true);

    await testCompletion(docUri, new vscode.Position(2, 4), " ", {
      items: [completions.custom.folder],
    });
    await testCompletion(docUri, new vscode.Position(4, 11), ".", {
      items: [],
    });
    await testCompletion(docUri, new vscode.Position(10, 15), ":", {
      items: [],
    });
  });

  it("should not provide custom completions when disabled", async () => {
    await activate(docUri);
    await configure(true, false);

    await testCompletion(docUri, new vscode.Position(2, 4), " ", {
      items: [completions.builtIn.type.dabble, completions.builtIn.type.model],
    });
    await testCompletion(docUri, new vscode.Position(8, 23), ".", {
      items: [],
    });
    await testCompletion(docUri, new vscode.Position(12, 37), ":", {
      items: [],
    });
  });

  it("should not provide completion if not a node entry", async () => {
    await activate(docUri);
    await configure(true, true);

    await testCompletion(docUri, new vscode.Position(0, 6), " ", {
      items: [],
    });
    await testCompletion(docUri, new vscode.Position(0, 6), ".", {
      items: [],
    });
    await testCompletion(docUri, new vscode.Position(0, 6), ":", {
      items: [],
    });
  });
});

async function testCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  triggerCharacter: string,
  expectedCompletionList: vscode.CompletionList
) {
  // Executing the command `vscode.executeCompletionItemProvider` to
  // simulate triggering completion
  const actualCompletionList = (await vscode.commands.executeCommand(
    "vscode.executeCompletionItemProvider",
    docUri,
    position,
    triggerCharacter
  )) as vscode.CompletionList;
  // The API somehow returns a "nodes" completion item which is missing when
  // manually testing the extension. We filter it out here.
  // TODO: set up editor defaultConfigurations instead of filtering them here
  const actualItems = actualCompletionList.items.filter((item) => {
    return (
      item.label !== "nodes" && item.kind !== vscode.CompletionItemKind.Text
    );
  });

  expect(actualItems.length).to.be.equal(expectedCompletionList.items.length);
  expectedCompletionList.items.forEach((expectedItem, i) => {
    const actualItem = actualItems[i];
    expect(actualItem.label).to.be.equal(expectedItem.label);
    expect(actualItem.kind).to.be.equal(expectedItem.kind);
    if (expectedItem.insertText !== undefined) {
      expect(actualItem.insertText).to.be.equal(expectedItem.insertText);
    }
  });
}
