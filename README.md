# PeekingDuck Pipeline Language Support

Provides [PeekingDuck](https://github.com/aimakerspace/PeekingDuck) pipeline language support for [Visual Studio Code](https://code.visualstudio.com/).

## Features
![demo](https://raw.githubusercontent.com/aimakerspace/vscode-peekingduck/main/assets/demo.gif)

1. Syntax highlighting
1. Code validation
   - Detects whether the pipeline file contains valid YAML
   - Detects errors such as:
     - Missing "nodes" key
     - Invalid custom folder name
     - Invalid node type and name
     - Invalid node config key
     - Invalid node definition
1. Autocompletion
   - Autocompletes custom folder name, node type, and nodes names
   - Inserts node config keys as a snippet *if available*

*Code validation and autocompletion require paths to the PeekingDuck package and/or custom nodes directory. Please refer to the configuration settings to set up the paths.*

## Extension settings
The following settings are supported:
- `peekingduck.maxNumberOfProblems`: Controls the maximum number of problems produced by the server.
- `peekingduck.path.package`: Path to the PeekingDuck package, you can use `python -c 'import peekingduck; print(peekingduck.__path__)'` to get this path.
- `peekingduck.path.customNodes`: Path to the PeekingDuck custom nodes directory.


## Contributing
The instructions are available in the [contributing guide](CONTRIBUTING.md).