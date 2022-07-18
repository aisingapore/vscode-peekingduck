# Contributing

## Grammar / Syntax Highlighting
Write the grammer in `syntaxes/peekingduck.tmLanguage.yml` and convert to JSON
using `js-yaml` package. No need to escape backslashes in YAML.

```
# Install js-yaml as a development only dependency in your extension
$ npm install js-yaml --save-dev

# Use the command-line tool to convert the YAML grammar file to JSON
$ npx js-yaml syntaxes/peekingduck.tmLanguage.yml > syntaxes/peekingduck.tmLanguage.json
```

## Developing the extension

### Getting started
1. Install the prerequisites:
    - Install the [latest Visual Studio Code](https://code.visualstudio.com/download)
    - [Node.js](https://nodejs.org/en/) v16.0.0 or higher
2. Fork and clone this repository and navigate to its folder.
   ```
   $ git clone https://github.com/<YOUR_USERNAME>/vscode-peekingduck.git
   $ cd vscode-peekingduck
   ```
3. Install the dependencies
   ```
   $ npm install
   ```
4. Transpile the Typescript to Javascript

### Developing the client side
1. Open the `vscode-peekingduck` folder in VSCode
2. Make changes as necessary and run the code using either F5 or the "Launch Client" option in "Run and Debug".
3. Run end-to-end tests with:
   ```
   npm run test
   ```

### Developing the server side
1. Open the `vscode-peekingduck` folder in VSCode
2. Make changes as necessary and run the code using the "Client + Server" option in "Run and Debug" or by changing the "Trace: Server" configuration option to "verbose".
3. Run server unit tests with:
   ```
   npm run test:server
   ```
4. Run test coverage for server side with:
   ```
   npm run coverage:server
   ```

**Note**: Sometimes when debugging with the "Client + Server" option, the server does not get started in time as the launched client does not have a PeekingDuck pipeline file open. Open a PeekingDuck pipeline file and use the "Attach to Server" launch configuration to attach the debugger.