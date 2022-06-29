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
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
import {
  Connection,
  RemoteClient,
  RemoteWorkspace,
} from "vscode-languageserver";
import { SettingsState } from "../src/pkd_settings";
import { SettingsHandler } from "../src/language_server/handlers/settings_handler";
import {
  getLanguageService,
  LanguageService,
} from "../src/language_service/pkd_language_service";
import { ValidationHandler } from "../src/language_server/handlers/validation_handler";
import { getPath } from "./utils/helper";
import { TestWorkspace } from "./utils/test_types";

const expect = chai.expect;
chai.use(sinonChai);

describe("Settings handler", () => {
  const sandbox = sinon.createSandbox();
  const id = "peekingduck";
  const connection = {} as Connection;
  let languageService: LanguageService;
  let settingsState: SettingsState;
  let validationHandler: sinon.SinonMock;
  let workspaceStub: sinon.SinonStubbedInstance<RemoteWorkspace>;

  beforeEach(() => {
    workspaceStub = sandbox.createStubInstance(TestWorkspace);
    connection.workspace = workspaceStub as unknown as RemoteWorkspace;
    connection.onDidChangeConfiguration = sandbox.mock();
    connection.client = {} as RemoteClient;
    connection.client.register = sandbox.mock();
    languageService = getLanguageService(id);
    settingsState = new SettingsState();
    validationHandler = sandbox.mock(ValidationHandler);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should not register configuration notification handler if client has no configuration capability", () => {
    settingsState.hasConfigurationCapability = false;
    settingsState.clientDynamicRegisterSupport = true;

    const settingsHandler = new SettingsHandler(
      connection,
      languageService,
      settingsState,
      validationHandler as unknown as ValidationHandler,
      id
    );
    settingsHandler.registerHandlers();
    expect(connection.client.register).not.called;
  });

  it("should not register configuration notification handler if client has no dynamic handler support", () => {
    settingsState.hasConfigurationCapability = true;
    settingsState.clientDynamicRegisterSupport = false;

    const settingsHandler = new SettingsHandler(
      connection,
      languageService,
      settingsState,
      validationHandler as unknown as ValidationHandler,
      id
    );
    settingsHandler.registerHandlers();
    expect(connection.client.register).not.called;
  });

  it("should register configuration notification handler if client has dynamic handler support", () => {
    settingsState.hasConfigurationCapability = true;
    settingsState.clientDynamicRegisterSupport = true;

    const settingsHandler = new SettingsHandler(
      connection,
      languageService,
      settingsState,
      validationHandler as unknown as ValidationHandler,
      id
    );
    settingsHandler.registerHandlers();
    expect(connection.client.register).called;
  });

  it("should update config paths for valid paths", async () => {
    settingsState.hasConfigurationCapability = true;
    settingsState.clientDynamicRegisterSupport = true;

    const settingsHandler = new SettingsHandler(
      connection,
      languageService,
      settingsState,
      validationHandler as unknown as ValidationHandler,
      id
    );
    settingsHandler.registerHandlers();

    const settings = {
      maxNumberOfProblems: 100,
      path: {
        package: getPath("./peekingduck"),
        customNodes: getPath("./custom_nodes"),
      },
    };
    // @ts-ignore, this doesn't pick the correct overload
    workspaceStub.getConfiguration.resolves(settings);
    await settingsHandler.pullConfiguration();

    expect(settingsState.builtIn.ok).to.be.true;
    expect(settingsState.builtIn.configDir).to.be.equal(
      path.join(settings.path.package, "configs")
    );
    expect(settingsState.custom.ok).to.be.true;
    expect(settingsState.custom.configDir).to.be.equal(
      path.join(settings.path.customNodes, "configs")
    );
  });

  it("should not update config paths for invalid paths", async () => {
    settingsState.hasConfigurationCapability = true;
    settingsState.clientDynamicRegisterSupport = true;

    const settingsHandler = new SettingsHandler(
      connection,
      languageService,
      settingsState,
      validationHandler as unknown as ValidationHandler,
      id
    );
    settingsHandler.registerHandlers();

    const settings = {
      maxNumberOfProblems: 100,
      path: {
        package: getPath("./fixtures/invalid_peekingduck"),
        customNodes: getPath("./fixtures/invalid_custom_nodes"),
      },
    };
    // @ts-ignore, this doesn't pick the correct overload
    workspaceStub.getConfiguration.resolves(settings);
    await settingsHandler.pullConfiguration();

    expect(settingsState.builtIn.ok).to.be.false;
    expect(settingsState.builtIn.configDir).to.be.equal("");
    expect(settingsState.custom.ok).to.be.false;
    expect(settingsState.custom.configDir).to.be.equal("");
  });
});
