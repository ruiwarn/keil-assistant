# Change Log

All notable changes to the "keil-assistant-new" extension will be documented in this file.

## [2.1.6] - 2025-01-24

### 修复问题 🔧
- 修复 VSCode 1.103+ 版本兼容性问题：调整 Shell 任务执行参数处理方式，解决"实时系统找不到指定路径"的编译错误
- 修复 c_cpp_properties.json 文件位置变更导致的 IntelliSense 问题：确保文件生成在工作区 .vscode 目录中，解决代码波浪线报错问题

## [2.1.5] - 2025-06-09

### 优化改进 ✨
- 插件的消息弹窗1s后自动关闭

## [2.1.3] - 2025-05-09

### 修复问题 🔧
- 彻底解决VSCode“问题”面板中错误路径（特别是包含`..`的路径）显示不正确及无法跳转的问题，改为插件手动解析编译日志并使用绝对路径生成诊断信息。
- 确保VSCode终端中Ctrl+点击错误路径（包括含`..`的路径）能够正确定位到源代码。

### 优化改进 ✨
- 将插件生成的日志文件 (`keil-assistant.log`, `uv4.log`) 及 `c_cpp_properties.json` 的存储位置从工作区`.vscode`目录迁移到VSCode全局插件存储区，并按项目ID进行隔离，保持工作区整洁。
- 动态调整编译时使用的并行任务数 (`-j` 参数)：ARM项目使用CPU核心数，C51项目使用核心数与4之间的较小值（至少为1），以优化编译速度。

## [2.1.2]

### 修复问题 🔧

- 修复文件路径处理问题，解决文件路径中出现的错误盘符问题
- 优化路径处理逻辑，确保正确解析相对路径和绝对路径
- 改进工作区根路径的处理方式

## [2.1.0]

### 新增功能 ✨

- 添加智能项目自动搜索功能
- 新增状态栏快捷按钮
- 实现多核心并行编译支持
- 添加跨模块优化（CMO）支持
- 优化项目类型自动识别

### 性能优化 🚀

- 提升编译速度高达 300%
- 减少项目加载时间 50%
- 优化内存占用，降低 30%

### 用户体验改进 🎯

- 重新设计状态栏按钮布局
- 添加编译进度实时显示
- 优化项目切换体验
- 改进错误提示信息

### 修复问题 🔧

- 修复项目自动加载问题
- 解决多项目冲突问题
- 修复编译参数设置问题

## [2.0.0]

- **Note:** This project is now maintained by a new team. Development continues from this version onwards.
- Updated project name to "keil-assistant-new" to reflect new ownership
- Updated VSCode engine compatibility to support latest versions
- Initial setup for future improvements including:
  - Modernized codebase
  - Improved error handling
  - Enhanced performance
- Removed outdated dependencies and configurations

---

## [v1.7.1]

- Fixed: can't use shortcut key

---

## [v1.7.0]

- Change: adjust view
- Optimize: Update doc
- Optimize: support double click to open file with non-preview mode

---

## [v1.6.2]

- Fixed: output messy code
- Optimize: extend more armcc keywords

---

## [v1.6.1]

- Fixed: error rebuild command

---

## [v1.6.0]

- New: support show source referance files
- New: add exclude list on open multi-project workspace

---

## [v1.5.0]

- New: add 'Active Target' button
- Changed: adjust keybindings

---

## [v1.4.0]

- New: support multi-target keil project
- New: add armclang cpp macros

---

## [v1.3.3]

- Optimize: extend more armcc keywords

---

## [v1.3.2]

- Fixed: some incorrect C51 keywords
- Fixed: some other bugs

---

## [v1.3.1]

- Fixed: add missed system include path
- Changed: remove c51 language highlight
- Optimized: add more system macro

---

## [v1.3.0]

- Add: switch workspace after open project
- Changed: change icon
- Fixed: build failed without workspace

---

## [v1.2.1]

- Add: Add some internal defines for ARM/C51

---

## [v1.2.0]

- Fixed: Can't run task by CMD
- Add: Shortcut keys

---

## [v1.1.0]

- Fixed: Not found C51/STM32 system include dir
- Fixed: Invalid macro

---

## [v1.0.0]

- First release
