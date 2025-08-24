# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keil Assistant New is a VSCode extension that provides comprehensive support for Keil µVision projects (C51 and ARM). This is a community-maintained fork that significantly improves upon the original with intelligent build features, multi-core compilation, and better project management.

## Development Commands

### Build and Development
```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run linting
npm run lint

# Build for production (includes webpack)
npm run vscode:prepublish

# Run webpack in development mode
npm run webpack

# Watch webpack builds
npm run webpack:watch

# Run tests
npm run test
```

### Key Commands to Run After Changes
- `npm run compile` - Always run this after TypeScript changes
- `npm run lint` - Run before committing to catch style issues
- `npm run vscode:prepublish` - Required before publishing the extension

## High-Level Architecture

### Core Components

**Main Extension Entry (`src/extension.ts`)**
- Extension activation/deactivation
- Command registration and handling
- Message debouncing system to prevent duplicate notifications
- Integration point for all extension features

**Resource Manager (`src/ResourceManager.ts`)**
- Manages Keil project file parsing and monitoring
- Handles XML parsing of .uvproj and .uvprojx files using xml2js
- Provides project tree view data for VSCode explorer
- Monitors file system changes for real-time project updates

**Command Line Handler (`src/CmdLineHandler.ts`)**  
- Manages compilation, rebuild, and download operations
- Interfaces with Keil UV4.exe command line interface
- Implements multi-core parallel compilation
- Handles Cross-Module-Optimization (CMO) support
- Manages build progress reporting and error parsing

### Key Architectural Patterns

**Project Detection & Management**
- Automatically scans workspace for .uvproj/.uvprojx files
- Smart filtering using configurable exclusion lists
- Support for custom project location directories
- Dynamic project type detection (C51 vs ARM)

**Multi-Core Build System**
- Automatic CPU core detection using `os.cpus()`
- Dynamic thread allocation: ARM projects use full cores, C51 projects limited to min(cores, 4)
- Build progress tracking with real-time status updates

**C/C++ Integration** 
- Auto-generates `c_cpp_properties.json` for proper IntelliSense
- Stores configuration files in VSCode global storage (isolated by project ID)
- Provides syntax highlighting and code snippets for A51 assembly

**Error Handling & Diagnostics**
- Custom diagnostic collection for build errors
- Problem matchers for C51, ARMCC, and GCC compiler outputs
- Manual parsing of build logs with absolute path resolution
- Click-to-navigate error support in terminal

## Important Configuration

### Extension Settings
- `KeilAssistant.C51.Uv4Path`: Path to Keil C51 UV4.exe
- `KeilAssistant.MDK.Uv4Path`: Path to Keil MDK UV4.exe  
- `KeilAssistant.Project.ExcludeList`: Project files to ignore
- `KeilAssistant.Project.FileLocationList`: Custom project search paths

### Key Keybindings
- `F7`: Build project
- `Ctrl+Alt+F7`: Rebuild project
- `Ctrl+Alt+D`: Download to device

## Platform Requirements

- **Windows Only**: Extension only works on Windows platform
- **Keil µVision 5+**: Requires Keil µVision 5 or higher
- **VSCode 1.85.0+**: Minimum VSCode version requirement

## File Structure Notes

- Main source: `src/` directory with TypeScript files
- Compiled output: `dist/src/` directory
- Entry point: `dist/src/extension.js`
- XML parsing: Uses xml2js library for project file parsing
- File watching: Uses custom FileWatcher utility for project monitoring

## Development Tips

1. **Use semantic search**: Always use `mcp__claude-context__search_code` first to find code patterns
2. **Message system**: The extension has a debouncing system for notifications - avoid bypassing it
3. **Multi-platform considerations**: Be aware this is Windows-only, don't add cross-platform code
4. **Path handling**: Extension has specific path resolution logic for handling relative paths with `..`
5. **Build optimization**: ARM and C51 projects have different threading strategies
6. **Log storage**: Logs and config files are stored in VSCode global storage, not workspace

## Testing

The extension includes a test framework using Mocha. Run tests with `npm run test` after running `npm run pretest` to lint and compile.