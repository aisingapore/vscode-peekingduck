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

import * as fs from "fs";
import * as jsyaml from "js-yaml";
import * as path from "path";
import { LanguageSettings } from "../pkd_language_service";

/** The config for each node when parsed from its <nodeName>.yml file */
interface ParsedNodeConfig {
  /**
   * Data types accepted by the node.
   *
   * @readonly
   */
  readonly input: string[];
  /**
   * Data types produced by the node.
   *
   * @readonly
   */
  readonly output: string[];
  /**
   * Other configurations that are not input or output. We are only interested
   * in the keys and not the values.
   *
   * @readonly
   */
  readonly [otherConfigs: string]: any;
}

/**
 * The config for each node stored by the analyzer for validation and
 * autocompletion.
 */
interface NodeConfig {
  /**
   * Data types accepted by the node.
   *
   * @readonly
   */
  readonly input: string[];
  /**
   * Data types produced by the node.
   *
   * @readonly
   */
  readonly output: string[];
  /**
   * Keys of non-input/output configs.
   *
   * @readonly
   */
  readonly configs: string[];
}

interface SchemaConfiguration {
  name: string;
  schema: Map<string, Map<string, NodeConfig>>;
}

const readonlyConfigs = {
  builtIn: new Map(),
  custom: new Map(),
};
readonlyConfigs.builtIn.set("dabble", new Map());
readonlyConfigs.builtIn.get("dabble").set("tracking", ["optional_inputs"]);
readonlyConfigs.builtIn.set("model", new Map());
readonlyConfigs.builtIn.get("model").set("csrnet", ["weights"]);
readonlyConfigs.builtIn
  .get("model")
  .set("efficientdet", ["image_size", "model_nodes", "num_classes", "weights"]);
readonlyConfigs.builtIn
  .get("model")
  .set("fairmot", ["model_type", "optional_inputs", "weights"]);
readonlyConfigs.builtIn
  .get("model")
  .set("hrnet", ["model_nodes", "model_type", "resolution", "weights"]);
readonlyConfigs.builtIn
  .get("model")
  .set("jde", ["model_type", "optional_inputs", "weights"]);
readonlyConfigs.builtIn.get("model").set("movenet", ["weights"]);
readonlyConfigs.builtIn
  .get("model")
  .set("mtcnn", ["model_nodes", "model_type", "weights"]);
readonlyConfigs.builtIn.get("model").set("posenet", ["model_nodes", "weights"]);
readonlyConfigs.builtIn
  .get("model")
  .set("yolo", ["input_size", "model_nodes", "num_classes", "weights"]);
readonlyConfigs.builtIn
  .get("model")
  .set("yolo_face", ["input_size", "weights"]);
readonlyConfigs.builtIn
  .get("model")
  .set("yolo_license_place", ["input_size", "weights"]);
readonlyConfigs.builtIn
  .get("model")
  .set("yolox", ["model_size", "num_classes", "weights"]);

export class PkdSchemaService {
  private readonly configExt = ".yml";
  private readonly ioKeys: string[] = ["input", "output"];
  /**
   * A nested map containing input/output data types and other config keys of
   * PeekingDuck and custom nodes.
   */
  schemaConfigs!: {
    builtIn: SchemaConfiguration;
    custom: SchemaConfiguration;
  };

  constructor() {
    this.clearSchemas();
  }

  /** Resets the parsed node configs and custom folder name. */
  clearSchemas(): void {
    this.schemaConfigs = {
      builtIn: { name: "", schema: new Map() },
      custom: { name: "", schema: new Map() },
    };
  }

  /**
   * Updates the built-in and custom nodes configs if available.
   *
   * @param settings Settings which specify if built-in and/or custom nodes
   *                 should be updated.
   */
  registerSchemas(settings: LanguageSettings): void {
    if (settings.parseSchema.builtIn) {
      this.updateSchema(
        settings.configDir.builtIn,
        this.schemaConfigs.builtIn.schema,
        readonlyConfigs.builtIn
      );
      console.log(this.schemaConfigs.builtIn.schema);
    }
    if (settings.parseSchema.custom) {
      this.schemaConfigs.custom.name = path.basename(
        path.dirname(settings.configDir.custom)
      );
      this.updateSchema(
        settings.configDir.custom,
        this.schemaConfigs.custom.schema,
        readonlyConfigs.custom
      );
      console.log(this.schemaConfigs.custom.schema);
    }
  }

  /**
   * Parse input/output and config keys of PeekingDuck/custom nodes to a nested
   * map.
   *
   * @param configDir Path to PeekingDuck/custom nodes configs directory, i.e.,
   *                  </path/to/peekingduck/configs> or
   *                  </path/to/src/custom_nodes/configs>.
   * @param schema The specified map for storing the parsed keys.
   */
  private updateSchema(
    configDir: string,
    schema: Map<string, Map<string, NodeConfig>>,
    ignoreConfigs: Map<string, Map<string, string[]>>
  ) {
    console.log(`Iterating through ${configDir}`);
    const nodeTypeFiles = fs.readdirSync(configDir);
    for (const nodeTypeFile of nodeTypeFiles) {
      const nodeTypeDir = path.join(configDir, nodeTypeFile);
      // Ignore non-directories
      if (!fs.statSync(nodeTypeDir).isDirectory()) continue;
      const nodeType = nodeTypeFile;
      const nodeTypeConfigs: Map<string, NodeConfig> = new Map();
      const nodeConfigFiles = fs.readdirSync(nodeTypeDir);
      for (const nodeConfigFile of nodeConfigFiles) {
        // Ignore files without ".yml" file extension
        if (path.extname(nodeConfigFile) !== this.configExt) continue;
        const nodeConfigPath = path.join(nodeTypeDir, nodeConfigFile);
        const nodeName = path.basename(nodeConfigFile, this.configExt);
        const nodeConfig = jsyaml.load(
          fs.readFileSync(nodeConfigPath, "utf8")
        ) as ParsedNodeConfig;
        const ignoreKeys = ignoreConfigs.get(nodeType)?.get(nodeName);
        nodeTypeConfigs.set(nodeName, {
          input: nodeConfig.input,
          output: nodeConfig.output,
          configs: this.getConfigKeys(
            nodeConfig,
            ignoreKeys === undefined ? [] : ignoreKeys
          ),
        });
        schema.set(nodeType, nodeTypeConfigs);
      }
    }
  }

  /**
   * Filters away "input" and "output" from config keys.
   *
   * @param config The parsed node configs.
   * @returns A list of config keys excluding "input" and "output".
   */
  private getConfigKeys(
    config: ParsedNodeConfig,
    ignoreKeys: string[]
  ): string[] {
    return Object.keys(config).filter((key) => {
      return !this.ioKeys.includes(key) && !ignoreKeys.includes(key);
    });
  }
}
