# Keil Assistant Community Fork

> A community-maintained VS Code extension for embedded developers working with Keil MDK/C51 projects.
>
> Continues the original Keil Assistant with active maintenance, AI integration, and compatibility-first improvements.

## Overview

Keil Assistant is a VS Code extension that bridges the gap between modern editor workflows and Keil uVision embedded projects. It provides project exploration, build automation, and IntelliSense configuration for ARM and C51 development — without leaving VS Code.

**Key stats:**
- **33+ stars**, 6 forks, active issue tracking
- Published on VS Code Marketplace as `candycium.keil-assistant-new`
- Used by embedded developers for STM32, NXP, and legacy 8051 workflows
- Compatible with Keil uVision 5+

## Why This Fork Exists

The original Keil Assistant stopped receiving updates. This community fork preserves the existing user base and configuration path while adding:

- Ongoing bug fixes and compatibility updates
- GitHub Copilot Chat Tools integration for AI-assisted builds
- Safer `c_cpp_properties.json` merging
- Improved project explorer with refresh, reveal, and state persistence

## Features

### Project Management
- Auto-discovers Keil C51/ARM projects in workspace
- Native project explorer with file tree, targets, and groups
- Automatic `c_cpp_properties.json` generation for C/C++ IntelliSense
- Watch Keil project files and sync changes in real time

### Build & Debug Workflow
- One-click build, rebuild, and download from VS Code status bar
- Target switching without opening Keil uVision
- Multi-core build execution when toolchain supports it
- Build output parsing with error navigation

### AI Integration (GitHub Copilot)
- `keil-assistant_buildProject` — build or rebuild via natural language
- `keil-assistant_getProjectInfo` — query project structure and active target
- Inspect build failures with file paths, line numbers, and error codes

### Compatibility-First Design
- Existing `KeilAssistant.*` config keys remain unchanged
- Optional explorer enhancements (sorting, auto-reveal, state restore) default to off
- Safer merge strategy for `c_cpp_properties.json` to avoid overwriting user fields

## Quick Start

1. Install the [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
2. Install Keil Assistant from Marketplace
3. Set `KeilAssistant.MDK.Uv4Path` or `KeilAssistant.C51.Uv4Path` to your `UV4.exe`
4. Open a folder containing `.uvprojx` / `.uvproj` / `.uv2` files
5. The project loads automatically — build from the status bar

## Requirements

- Windows (Keil uVision is Windows-only)
- Keil uVision 5 or later
- VS Code 1.80+

## Repository

- **Source:** https://github.com/ruiwarn/keil-assistant
- **Issues:** https://github.com/ruiwarn/keil-assistant/issues
- **Marketplace:** `candycium.keil-assistant-new`

## Community

Maintained by embedded developers, for embedded developers. Contributions, bug reports, and feature requests welcome.

---

*This is a community-maintained continuation starting from v2.0.0. The original project is no longer actively updated.*
