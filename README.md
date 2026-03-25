# Keil Assistant Community Fork

> A community-maintained continuation of the original Keil Assistant for VS Code.
>
> This extension keeps the existing Marketplace item `candycium.keil-assistant-new` so current users can stay on the same settings and update path while receiving ongoing independent maintenance and feature development in this repository.
>
> 中文说明：这是基于原版 Keil Assistant 延续演进的社区维护版本，保留现有扩展 ID 与配置键，尽量不打断老用户升级和使用路径。

## What Is Different In This Edition?

- Community-maintained releases after the original extension stopped active updates
- GitHub Copilot Chat Tools integration for build and project queries
- Compatibility-first project explorer improvements that keep old defaults unchanged
- Safer `c_cpp_properties.json` merging to reduce accidental overwrite of user-owned fields
- Clearer path validation and cache recovery commands for broken project states

## Project Origin

- This repository started from the original **Keil Assistant** codebase and now follows its own maintenance and release cycle.
- The current goal is to preserve the existing user path while continuing to fix bugs and add carefully scoped improvements.
- Existing configuration keys such as `KeilAssistant.*` remain unchanged so old users do not need to reconfigure the extension.
- Repository: <https://github.com/ruiwarn/keil-assistant>
- Issues: <https://github.com/ruiwarn/keil-assistant/issues>

## Highlights

- **AI-assisted build workflow**: integrates GitHub Copilot Chat Tools for build and project-info queries
- **Automatic project discovery**: scans the workspace for Keil projects and loads them with minimal setup
- **Project explorer quality-of-life**: adds refresh, reveal, sorting, and optional state restore without changing old defaults
- **Build workflow integration**: supports build, rebuild, download, and target switching directly from VS Code
- **Embedded-focused compatibility**: keeps support for Keil C51 and ARM project flows on Windows

## GitHub Copilot Integration

> Requires the GitHub Copilot extension

Use Chat Tools with Copilot to:
- build the active project or a specific target
- query project structure and active target information
- inspect build failures with file paths, line numbers, and codes

**Available tools**:
- `keil-assistant_buildProject` - build or rebuild a Keil project target
- `keil-assistant_getProjectInfo` - read the current Keil project structure

## Explorer And Build Experience

- status bar actions for build, rebuild, and download
- project explorer actions for refresh, cache reset, and current-file reveal
- automatic project detection with configurable include and exclude lists
- multi-core build execution when the toolchain supports it

## 使用指南 📖

### 1. 安装配置

1. 安装 [C/C++ 插件](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
2. 设置 Keil UV4.exe 路径（仅首次使用需要）

### 2. 开始使用

1. 使用 VSCode 打开任意包含 Keil 项目的文件夹
2. 插件将自动检测并加载项目
3. 使用状态栏按钮进行编译操作

### 3. 高级功能

- **多核心编译**：自动启用，无需配置
- **项目切换**：点击项目名快速切换
- **编译配置**：支持自定义编译参数

### 4. 兼容性优先的工程树选项

- 配置入口：`Ctrl+,` 打开 VS Code Settings，搜索 `KeilAssistant.ProjectExplorer`
- `KeilAssistant.ProjectExplorer.RememberExpandedState`：记住工程树展开状态，默认 `false`
- `KeilAssistant.ProjectExplorer.SortOrder`：根工程排序方式，可选 `legacy`、`name`、`path`，默认 `legacy`
- `KeilAssistant.ProjectExplorer.AutoRevealCurrentFile`：自动在工程树中定位当前文件，默认 `false`

### 5. 新增命令

- `Refresh Keil Project`
- `Clear Project Cache And Refresh`
- `Reveal Current File In Keil Project`
- 使用入口：
  - 工程树标题栏：`Refresh Keil Project`、`Reveal Current File In Keil Project`
  - 工程树项目右键菜单：`Refresh Keil Project`、`Clear Project Cache And Refresh`、`Reveal Current File In Keil Project`
  - 命令面板仍然保留以上 3 个命令，兼容老用户习惯

## 问题反馈 💬

如有问题或建议，请通过以下方式联系：

[![GitHub Issues](https://img.shields.io/badge/GitHub-Issues-181717?style=flat&logo=github&logoColor=white)](https://github.com/ruiwarn/keil-assistant/issues)

[![X](https://img.shields.io/badge/X-@ruiapp-000000?style=flat&logo=x&logoColor=white)](https://x.com/ruiapp)

[![Telegram](https://img.shields.io/badge/Telegram-@appcium-26A5E4?style=flat&logo=telegram&logoColor=white)](https://t.me/appcium)

[![Email](https://img.shields.io/badge/Email-rui@ruiapp.com-EA4335?style=flat&logo=gmail&logoColor=white)](mailto:rui@ruiapp.com)



**注意：这是一个由社区接手维护的版本，从 v2.0.0 开始。原始项目已不再更新。**

## 简述 📑

VSCode 上的 Keil 辅助工具，与 C/C++ 插件配合使用。

能够为 Keil 项目提供语法高亮、代码片段的功能，并支持对 Keil 项目进行编译、下载。

**仅支持 Keil uVision 5 及以上版本**

**仅支持 Windows 平台**

---

## 功能特性🎉

- 加载 Keil C51/ARM 项目，并以 Keil 项目资源管理器的展示方式显示项目视图
- 自动监视 Keil 项目文件的变化，及时更新项目视图
- 通过调用 Keil 命令行接口实现编译，重新编译，烧录 Keil 项目
- 自动生成 `c_cpp_properties.json` 文件，使 C/C++ 插件的语法分析能正常进行

---

## 用法 📖

### 准备工作

1. 安装 [C/C++ 插件](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
2. 进入 Keil Assistant Community Fork 插件设置，设置好 Keil 可执行文件 `UV4.exe` 的绝对路径
3. 配置入口：
   - `Ctrl+,` 打开设置，搜索 `Keil Assistant Community Fork`
   - 或直接搜索 `KeilAssistant.C51.Uv4Path` / `KeilAssistant.MDK.Uv4Path`
