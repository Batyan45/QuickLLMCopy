# Quick LLM Copy

![Extension Icon](images/icon.png)

Simple VSCode extension that allows you to copy code files with their relative paths in a format suitable for LLM conversations.

## Features

- Adds "Quick LLM Copy" option to the context menu in file explorer
- Supports copying multiple files at once
- Supports recursive copying of directories and their contents
- Includes relative file paths in the copied text
- Formats the output in a way that's easy to paste into LLM conversations

## Usage

1. Right-click on a file, directory, or select multiple files/directories in the VSCode explorer
2. Click "Quick LLM Copy" from the context menu
3. The code will be copied to your clipboard in the following format: 

```
Provided code:

File: path/to/file1
// file1 contents

File: path/to/file2
// file2 contents
```


## Requirements

- Visual Studio Code version 1.60.0 or higher

## Extension Settings

This extension contributes the following settings:

* `quickLLMCopy.prefixText`: The text that appears before the copied code content (default: "Provided code:")

## Known Issues

None at the moment.

## Future Plans

- Add support for custom output formats
- Add the ability to shorten code by removing comments or anything else
- Add support for filtering files by extension
- Improve handling of large files

## Release Notes

See CHANGELOG.md for detailed release notes.
