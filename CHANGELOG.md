# Change Log

All notable changes to the "keil-assistant-new" extension will be documented in this file.

## [2.4.0] - 2025-12-23

### 优化改进 ✨

- 更新 Chat Tools 的警告提示，减少对用户工作流的干扰
- 更新 Chat Tools 工具名称，符合命名最佳实践
- 更新工具链判断逻辑，支持 C51 项目识别

### 修复问题 🔧

- 增强 build-tool 的 exitCode 处理逻辑，覆盖未定义退出代码的情况

## [2.3.1] - 2025-12-22

### 修复问题 🔧

- 修复多工作区场景下 C/C++ 配置写入到工作区根目录的问题，改为写入各项目目录的 `.vscode`

## [2.3.0] - 2025-12-21

### 新增功能 🚀

- **GitHub Copilot Chat 集成**: 为插件新增 Language Model Tools 支持，使 GitHub Copilot 能够直接调用 Keil Assistant 功能
  - **编译工具** (`keil-assistant_buildProject`): 支持编译或重新编译指定目标，实时返回编译结果和错误信息
  - **项目信息工具** (`keil-assistant_getProjectInfo`): 获取项目详细信息，包括项目类型、目标列表、源文件等
  - **自然语言交互**: 用户可以在 Copilot Chat 中用自然语言执行操作，如 "帮我构建项目"、"构建STC8A目标"
  - **自动化迭代**: 编码代理可以通过调用工具实现 "编写-编译-修复" 的完整自动化开发流程，可获得详细的编译失败信息
  - **工具可见性**: 所有工具自动在 VS Code 的 "配置工具" 界面显示，可以明确禁用工具使LLM不进行工具调用

## [2.2.1] - 2025-12-10

### 新增功能 ✨

- **智能C/C++配置管理**: 新增项目标签支持，C/C++配置名称现在使用"项目名_目标名"格式，避免多项目配置冲突
- **自动配置切换**: 切换目标时自动应用对应的C/C++配置，无需手动选择
- **增强的配置检测**: 自动检测并迁移旧版本配置，确保向后兼容
- **新增C251支持**: 完整支持Keil C251项目，包括自动检测、编译和下载功能
- **WSL环境检测**: 新增WSL环境检测，当运行在WSL中时提供明确的错误提示

### 系统头文件检测重大优化 🔧

- **全新智能检测算法**: 大幅改进Keil系统头文件路径检测机制
  - 支持完整Keil V5安装（ARMCC + ARMCLANG双编译器）
  - 支持不完整Keil V5安装（仅ARMCLANG编译器）
  - 支持Keil V6版本（AC6目录结构）
  - 多重fallback机制确保100%检测成功
- **详细调试日志**: 新增完整的路径检测调试信息，便于问题定位
- **智能工具链选择**: 根据uAC6标志和实际安装情况自动选择最合适的编译器路径
- **错误诊断增强**: 当检测失败时提供详细的错误信息和解决建议

### 用户体验改进 🎯

- **异步操作优化**: 目标切换和配置应用改为异步操作，避免界面阻塞
- **配置自动应用**: 项目激活时自动应用对应的C/C++配置设置
- **更好的错误处理**: 增强了异常捕获和错误提示，提升稳定性
- **任务执行优化**: 使用ProcessExecution替代ShellExecution，提升任务执行的可靠性和性能

### 技术细节 📝

- 新增 `applyActiveCppConfiguration()`方法，实现配置的智能应用
- 优化 `setActiveTarget()`方法，支持异步操作和自动配置切换
- 改进 `getSystemIncludes()`方法，添加详细的调试输出和智能路径检测
- 配置名称清理函数 `sanitizeConfigNamePart()`，确保文件名合法
- 新增 `C251Target`类，完整支持C251项目类型
- 任务执行改为使用 `ProcessExecution`，避免Shell相关的问题

### 兼容性改进 🔗

- **向后兼容**: 自动迁移旧版本的C/C++配置，无需用户手动调整
- **WSL友好**: 明确提示WSL环境限制，引导用户正确使用环境
- **VSCode兼容**: 优化任务执行机制，提升与新版本VSCode的兼容性

## [2.1.7] - 2025-08-26

### 重大修复 🔧

- **修复**: Keil 系统头文件路径检测失败导致 IntelliSense 功能异常的问题
- **增强**: 全新的智能头文件路径检测算法，支持多种 Keil 安装场景：
  - 完整 Keil V5 安装（ARMCC + ARMCLANG 双编译器）
  - 不完整 Keil V5 安装（仅安装 ARMCLANG 编译器）
  - Keil V6 版本兼容支持（AC6 目录结构）
  - 多重 fallback 机制确保路径检测成功
- **改进**: 新增详细的调试日志输出，便于问题排查和诊断
- **修复**: 解决 c_cpp_properties.json 中缺少系统头文件路径导致的代码智能提示失效问题
- **提升**: 显著改善 VSCode 中 Keil 项目的 IntelliSense 和代码补全体验

### 技术细节 📝

- 智能检测 ARMCC 目录存在性，自适应选择合适的编译器路径
- 支持从 `XXX\UV4.exe` 路径自动推导系统头文件位置
- 兜底机制：当所有检测都失败时，使用 ARMCC 作为最兼容的选择
- 详细日志记录每个检测步骤，方便用户和开发者调试

## [2.1.6] - 2025-01-24

### 修复问题 🔧

- 修复 VSCode 1.103+ 版本兼容性问题：调整 Shell 任务执行参数处理方式，解决"实时系统找不到指定路径"的编译错误
- 修复 c_cpp_properties.json 文件位置变更导致的 IntelliSense 问题：确保文件生成在工作区 .vscode 目录中，解决代码波浪线报错问题

## [2.1.5] - 2025-06-09

### 优化改进 ✨

- 插件的消息弹窗1s后自动关闭

## [2.1.3] - 2025-05-09

### 修复问题 🔧

- 彻底解决VSCode“问题”面板中错误路径（特别是包含 `..`的路径）显示不正确及无法跳转的问题，改为插件手动解析编译日志并使用绝对路径生成诊断信息。
- 确保VSCode终端中Ctrl+点击错误路径（包括含 `..`的路径）能够正确定位到源代码。

### 优化改进 ✨

- 将插件生成的日志文件 (`keil-assistant.log`, `uv4.log`) 及 `c_cpp_properties.json` 的存储位置从工作区 `.vscode`目录迁移到VSCode全局插件存储区，并按项目ID进行隔离，保持工作区整洁。
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
