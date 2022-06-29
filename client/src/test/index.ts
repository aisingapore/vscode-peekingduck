/*-----------------------------------------------------------------------------
 * Modifications copyright 2022 AI Singapore
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
 *
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See THIRDPARTYNOTICES in the project root
 * for license information.
 *----------------------------------------------------------------------------*/

import * as glob from "glob";
import * as path from "path";
import * as Mocha from "mocha";

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({ ui: "bdd", timeout: 10000 });

  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    glob("**.test.js", { cwd: testsRoot }, (err, files) => {
      if (err) return reject(err);

      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });
}
