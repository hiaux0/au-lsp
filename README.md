# LSP Example

Heavily documented sample code for https://code.visualstudio.com/api/language-extensions/language-server-extension-guide

## Functionality

This Language Server works for plain text file. It has the following language features:
- Completions
- Diagnostics regenerated on each file change or configuration change

It also includes an End-to-End test.

## Structure

```
.
├── client // Language Client
│   ├── src
│   │   ├── test // End to End tests for Language Client / Server
│   │   └── extension.ts // Language Client entry point
├── package.json // The extension manifest.
└── server // Language Server
    └── src
        └── server.ts // Language Server entry point
```

## Running the Sample

- Run `npm install` in this folder. This installs all necessary npm modules in both the client and server folder
- Open VS Code on this folder.
- Press Ctrl+Shift+B to compile the client and server.
- Switch to the Debug viewlet.
- Select `Launch Client` from the drop down.
- Run the launch config.
- If you want to debug the server as well use the launch configuration `Attach to Server`
- In the [Extension Development Host] instance of VSCode, open a document in 'plain text' language mode.
  - Type `j` or `t` to see `Javascript` and `TypeScript` completion.
  - Enter text content such as `AAA aaa BBB`. The extension will emit diagnostics for all words in all-uppercase.

---

# LSP Example for Log Streaming

This is a repository adapted from [lsp-sample](https://github.com/Microsoft/vscode-extension-samples/tree/master/lsp-sample) to demonstrate

- Usage of the JSON output
- Streaming the JSON into [LSP Inspector](https://github.com/Microsoft/language-server-protocol-inspector)

## Demo

![demo](demo.gif)

## Synopsis

- With `vscode-languageclient@5.1.0-next.9`, you can specify a JSON log output format with `[langId].trace.server` as follows:
  ```jsonc
  "languageServerExample.trace.server": {
    "format": "json", // or "text"
    "verbosity": "verbose" // or "off" | "messages"
  }
  ```
- A [webview](https://github.com/Microsoft/language-server-protocol-inspector/tree/master/lsp-inspector-webview) build of the LSP Inspector can be downloaded here: https://marketplace.visualstudio.com/items?itemName=octref.lsp-inspector-webview
- When using the Webview LSP Inspector, it will open a WebSocket Server taking incoming connection that sends logs following [this format](https://github.com/Microsoft/language-server-protocol-inspector#log-format).
- You can stream the JSON log of any Language Server using `vscode-languageclient` to the LSP Inspector, and it will show a live view of the LSP connection.

## Running the Sample

- Install the [LSP Inspector Webview](https://marketplace.visualstudio.com/items?itemName=octref.lsp-inspector-webview) extension
- Compile and Run this Extension
  - `npm install`
  - `npm run compile`
  - F5 to run the extension
- Add the following setting:
  ```json
  "languageServerExample.trace.server": {
    "format": "json",
    "verbosity": "verbose"
  },
  ```
- Open a txt file so this Language Server gets activated
- Run command "LSP Inspector: Start LSP Inspector"
- Run command "Start Stream Logs into languageServerExample.port"
- As you are typing, doing auto-completion, many messages should show up in the inspector, such as
  - `textDocument/didChange`
  - `textDocument/completion`
  - `textDocument/publishDiagnostics`
