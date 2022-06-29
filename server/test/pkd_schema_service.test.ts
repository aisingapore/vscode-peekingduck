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
import * as path from "path";
import { LanguageSettings } from "../src/language_service/pkd_language_service";
import { PkdSchemaService } from "../src/language_service/services/pkd_schema_service";
import { getPath, LanguageSettingsSetup } from "./utils/helper";

const expect = chai.expect;

describe("PKD Schema Service", () => {
  let languageSettings: LanguageSettings;
  const builtInPath = getPath("./peekingduck/configs");
  const customPath = getPath("./custom_nodes/configs");
  const builtIn = {
    bboxCount: {
      input: ["bboxes"],
      output: ["count"],
      configs: [],
    },
    fps: {
      input: ["pipeline_end"],
      output: ["fps"],
      configs: ["fps_log_display", "fps_log_freq", "dampen_fps"],
    },
    yolo: {
      input: ["img"],
      output: ["bboxes", "bbox_labels", "bbox_scores"],
      configs: [
        "weights_parent_dir",
        "max_output_size_per_class",
        "max_total_size",
        "model_format",
        "model_type",
        "detect",
        "iou_threshold",
        "score_threshold",
      ],
    },
  };
  const custom = {
    myDabbleNode: {
      input: ["in_1", "in_2"],
      output: ["out_1", "out_2"],
      configs: ["dabble_conf_1", "dabble_conf_2", "dabble_conf_3"],
    },
    myModelNode: {
      input: ["in_1", "in_2"],
      output: ["out_1", "out_2"],
      configs: ["model_conf_1"],
    },
    // Hard coded readonlyConfigs only apply to built-in nodes
    yolo: {
      input: ["img"],
      output: ["bboxes", "bbox_labels", "bbox_scores"],
      configs: [
        "weights_parent_dir",
        "weights",
        "input_size",
        "max_output_size_per_class",
        "max_total_size",
        "num_classes",
        "model_nodes",
        "model_format",
        "model_type",
        "detect",
        "iou_threshold",
        "score_threshold",
      ],
    },
  };

  beforeEach(() => {
    languageSettings = new LanguageSettingsSetup().languageSettings;
  });

  it("should initialize schemas", () => {
    const service = new PkdSchemaService();

    expect(service.schemaConfigs.builtIn.name).to.be.equal("");
    expect(service.schemaConfigs.builtIn.schema instanceof Map).to.be.true;
    expect(service.schemaConfigs.custom.name).to.be.equal("");
    expect(service.schemaConfigs.custom.schema instanceof Map).to.be.true;
  });

  it("should register nothing", () => {
    const service = new PkdSchemaService();
    service.registerSchemas(languageSettings);

    expect(service.schemaConfigs.builtIn.schema).to.be.empty;
    expect(service.schemaConfigs.custom.schema).to.be.empty;
    expect(service.schemaConfigs.custom.name).to.be.equal("");
  });

  it("should register built-in schema", () => {
    languageSettings.parseSchema.builtIn = true;
    languageSettings.configDir.builtIn = builtInPath;

    const service = new PkdSchemaService();
    service.registerSchemas(languageSettings);
    const schema = service.schemaConfigs.builtIn.schema;

    expect(schema).to.have.all.keys("dabble", "model");
    expect(schema.get("dabble")).to.have.all.keys("bbox_count", "fps");
    expect(schema.get("model")).to.have.all.keys("yolo");

    expect(schema.get("dabble")?.get("bbox_count")).to.deep.equal(
      builtIn.bboxCount
    );
    expect(schema.get("dabble")?.get("fps")).to.deep.equal(builtIn.fps);
    expect(schema.get("model")?.get("yolo")).to.deep.equal(builtIn.yolo);

    expect(schema).to.not.have.any.keys("invalid_type");
    expect(schema.get("dabble")).to.not.have.any.keys("invalid_node");
  });

  it("should register custom schema", () => {
    languageSettings.parseSchema.custom = true;
    languageSettings.configDir.custom = customPath;

    const service = new PkdSchemaService();
    service.registerSchemas(languageSettings);
    const schema = service.schemaConfigs.custom.schema;

    expect(service.schemaConfigs.custom.name).to.be.equal(
      path.basename(path.dirname(customPath))
    );
    expect(schema).to.have.all.keys("my_dabble", "model");
    expect(schema.get("my_dabble")).to.have.all.keys("my_dabble_node");
    expect(schema.get("model")).to.have.all.keys("my_model_node", "yolo");

    expect(schema.get("my_dabble")?.get("my_dabble_node")).to.deep.equal(
      custom.myDabbleNode
    );
    expect(schema.get("model")?.get("my_model_node")).to.deep.equal(
      custom.myModelNode
    );
    expect(schema.get("model")?.get("yolo")).to.deep.equal(custom.yolo);
  });

  it("should register both schemas", () => {
    languageSettings.parseSchema.builtIn = true;
    languageSettings.configDir.builtIn = builtInPath;
    languageSettings.parseSchema.custom = true;
    languageSettings.configDir.custom = customPath;

    const service = new PkdSchemaService();
    service.registerSchemas(languageSettings);
    const builtInSchema = service.schemaConfigs.builtIn.schema;
    const customSchema = service.schemaConfigs.custom.schema;

    expect(builtInSchema).to.have.all.keys("dabble", "model");
    expect(builtInSchema.get("dabble")).to.have.all.keys("bbox_count", "fps");
    expect(builtInSchema.get("model")).to.have.all.keys("yolo");

    expect(builtInSchema.get("dabble")?.get("bbox_count")).to.deep.equal(
      builtIn.bboxCount
    );
    expect(builtInSchema.get("dabble")?.get("fps")).to.deep.equal(builtIn.fps);
    expect(builtInSchema.get("model")?.get("yolo")).to.deep.equal(builtIn.yolo);

    expect(builtInSchema).to.not.have.any.keys("invalid_type");
    expect(builtInSchema.get("dabble")).to.not.have.any.keys("invalid_node");

    expect(service.schemaConfigs.custom.name).to.be.equal(
      path.basename(path.dirname(customPath))
    );
    expect(customSchema).to.have.all.keys("my_dabble", "model");
    expect(customSchema.get("my_dabble")).to.have.all.keys("my_dabble_node");
    expect(customSchema.get("model")).to.have.all.keys("my_model_node", "yolo");

    expect(customSchema.get("my_dabble")?.get("my_dabble_node")).to.deep.equal(
      custom.myDabbleNode
    );
    expect(customSchema.get("model")?.get("my_model_node")).to.deep.equal(
      custom.myModelNode
    );
    expect(customSchema.get("model")?.get("yolo")).to.deep.equal(custom.yolo);
  });

  it("should clear schemas", () => {
    languageSettings.parseSchema.builtIn = true;
    languageSettings.configDir.builtIn = builtInPath;
    languageSettings.parseSchema.custom = true;
    languageSettings.configDir.custom = customPath;

    const service = new PkdSchemaService();
    service.registerSchemas(languageSettings);
    service.clearSchemas();

    expect(service.schemaConfigs.builtIn.schema).to.be.empty;
    expect(service.schemaConfigs.custom.schema).to.be.empty;
    expect(service.schemaConfigs.custom.name).to.be.equal("");
  });
});
