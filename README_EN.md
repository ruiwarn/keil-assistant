# Keil Assistant Community Fork

> A community-maintained continuation of the original Keil Assistant for VS Code.
>
> This repository keeps the existing Marketplace item `candycium.keil-assistant-new` so current users can stay on the same settings and update path while independent maintenance continues here.

## What Is Different In This Edition?

- Community-maintained fixes and releases after the original extension stopped active updates
- GitHub Copilot Chat Tools integration for build and project queries
- Compatibility-first project explorer improvements that preserve old defaults
- Safer `c_cpp_properties.json` merging and clearer recovery commands

## Project Origin

- This repository started from the original **Keil Assistant** codebase and now follows its own maintenance and release cycle.
- Existing installs keep the same extension ID and `KeilAssistant.*` settings keys.
- Repository: <https://github.com/ruiwarn/keil-assistant>
- Issues: <https://github.com/ruiwarn/keil-assistant/issues>

## Highlights

- **AI-assisted build workflow** with Copilot Chat Tools
- **Automatic project discovery** for Keil workspaces
- **Explorer quality-of-life updates** for refresh, reveal, sorting, and optional state restore
- **Direct build integration** for build, rebuild, download, and target switching

## GitHub Copilot Integration

> Requires GitHub Copilot extension

Use Chat Tools with Copilot to:
- build the active project or a specific target
- inspect project structure and target information
- diagnose build failures with detailed error output

**Available Tools**:
- `keil-assistant_buildProject` - Build or rebuild project targets
- `keil-assistant_getProjectInfo` - Get detailed project information

## Explorer And Build Experience

- status bar actions for build, rebuild, and download
- project explorer actions for refresh, cache reset, and current-file reveal
- automatic project detection with configurable include and exclude lists
- multi-core build execution when the toolchain supports it

## Usage Guide 📖

### 1. Installation Setup
1. Install [C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
2. Set Keil UV4.exe path (only required for first use)

### 2. Getting Started
1. Open any folder containing Keil projects with VSCode
2. Plugin will automatically detect and load projects
3. Use status bar buttons for build operations

### 3. Advanced Features
- **Multi-Core Build**: Automatically enabled, no configuration needed
- **Project Switching**: Quick switch with project name click
- **Build Configuration**: Custom build parameter support

## Configuration Options ⚙️

### Workspace Settings
1. Project Exclusion List:
```json
{
    "KeilAssistant.Project.ExcludeList": [
        "template.uvproj",
        "template.uvprojx"
    ]
}
```

2. Project Location List:
```json
{
    "KeilAssistant.Project.FileLocationList": [
        "./project",
        "./examples"
    ]
}
```

3. Compatibility-first project explorer options:
```json
{
    "KeilAssistant.ProjectExplorer.RememberExpandedState": false,
    "KeilAssistant.ProjectExplorer.SortOrder": "legacy",
    "KeilAssistant.ProjectExplorer.AutoRevealCurrentFile": false
}
```

### Commands

- `Refresh Keil Project`
- `Clear Project Cache And Refresh`
- `Reveal Current File In Keil Project`

## System Requirements 💻

- Windows 7/8/10/11
- Keil uVision 5 or higher
- VSCode 1.60.0 or higher

## Rating Criteria ⭐

- Feature Completeness: ⭐⭐⭐⭐⭐
- Ease of Use: ⭐⭐⭐⭐⭐
- Performance Optimization: ⭐⭐⭐⭐⭐
- Documentation Quality: ⭐⭐⭐⭐⭐
- User Experience: ⭐⭐⭐⭐⭐

Total Score: 25/25 Perfect!

## Feedback 💬

For issues or suggestions, please reach out through:

[![GitHub Issues](https://img.shields.io/badge/GitHub-Issues-181717?style=flat&logo=github&logoColor=white)](https://github.com/ruiwarn/keil-assistant/issues)

[![X](https://img.shields.io/badge/X-@ruiapp-000000?style=flat&logo=x&logoColor=white)](https://x.com/ruiapp)

[![Telegram](https://img.shields.io/badge/Telegram-@appcium-26A5E4?style=flat&logo=telegram&logoColor=white)](https://t.me/appcium)

[![Email](https://img.shields.io/badge/Email-rui@ruiapp.com-EA4335?style=flat&logo=gmail&logoColor=white)](mailto:rui@ruiapp.com)


**Note: This is a community-maintained version starting from v2.0.0. The original project is no longer updated.**

## Summary 📑

A Keil assistant tool for VSCode, working in conjunction with the C/C++ extension.

Provides syntax highlighting, code snippets for Keil projects, and supports compiling and downloading Keil projects.

**Supports Keil uVision 5 and above only**

**Windows platform only**

---

## Features 🎉

- Load Keil C51/ARM projects and display project view in Keil-style explorer
- Automatically monitor Keil project file changes and update project view in real-time
- Compile, rebuild, and download Keil projects through command-line interface
- Auto-generate `c_cpp_properties.json` for proper C/C++ extension syntax analysis

---

## Usage 📖

### Preparation

1. Install [C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
2. Enter Keil Assistant Community Fork plugin settings and set the absolute path of Keil executable `UV4.exe`
3. Configuration entry:
   - Press `Ctrl+,` and search for `Keil Assistant Community Fork`
   - Or search directly for `KeilAssistant.C51.Uv4Path` / `KeilAssistant.MDK.Uv4Path`
