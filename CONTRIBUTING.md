# Contributing

## Grammar / Syntax Highlighting
Write the grammer in `syntaxes/peekingduck.tmLanguage.yml` and convert to JSON
using `js-yaml` package. No need to escape backslashes in YAML.

```
# Install js-yaml as a development only dependency in your extension
$ npm install js-yaml --save-dev

# Use the command-line tool to convert the yaml grammar to json
$ npx js-yaml syntaxes/peekingduck.tmLanguage.yml > syntaxes/peekingduck.tmLanguage.json
```