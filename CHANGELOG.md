# Change Log

All notable changes to the "Quick LLM Copy" extension will be documented in this file.

## [0.0.5] - 2025-03-02

### Added
- Added "Quick LLM Copy (with Codebase)" option to include project directory structure
- Added configurable codebase text setting (`quickLLMCopy.codebaseText`)
- Users can now customize the text that appears before the codebase structure

## [0.0.4] - 2025-01-12

### Added
- Added configurable prefix text setting (`quickLLMCopy.prefixText`)
- Users can now customize the text that appears before copied code content

## [0.0.3] - 2025-01-11

### Added
- Support for recursive directory copying
- Improved error handling for file processing
- Skip unreadable files while continuing with others
- Comprehensive test suite with coverage for:
  - Single file copying
  - Multiple files copying
  - Directory recursive copying
  - Error handling for non-existent files
  - Extension activation

## [0.0.2] - 2025-01-07

### Added
- "Quick LLM Copy" context menu option
- Initial release
- Support for copying single and multiple files
- Relative path information in copied text 