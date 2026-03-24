# Compatible Issue Support Design

## 背景

当前仓库有一组开放 issue 指向两类问题：

1. 现有行为对用户自定义内容不够友好，例如 `c_cpp_properties.json` 被插件反复覆盖。
2. 工程树交互、刷新与错误提示还不够稳妥，例如展开状态、工程排序、文件定位、缓存刷新、路径报错定位不清。

这轮工作的边界已经确认：

- 支持 `#18`、`#22`、`#23`、`#24`、`#25`、`#26`
- 不支持 `.uvproj/.uvprojx` 写回，因此不做真正的 `add file` / 修改 `include path`
- 不支持断点、变量监控、调试器接入

## 目标

- 在不破坏老用户默认体验的前提下，补齐中小改动范围内可稳定落地的需求
- 默认行为保持和当前版本一致，新增能力通过“更保守的内部实现”或“显式命令 / 显式设置”提供
- 通过可测试的纯函数辅助模块，把高风险逻辑从 [src/extension.ts](/mnt/f/work_directory/Project/github/vscode_tools/keil-assistant/src/extension.ts) 中拆出来，降低回归风险

## 非目标

- 不重构整个扩展架构
- 不改变现有 build / rebuild / download / open project 的默认交互
- 不改变 target、group、source 的默认展示顺序
- 不引入必须开启的新 UI 模式

## 兼容性护栏

### 1. 默认体验不变

- `KeilAssistant.ProjectExplorer.RememberExpandedState` 默认 `false`
- `KeilAssistant.ProjectExplorer.SortOrder` 默认 `legacy`
- `KeilAssistant.ProjectExplorer.AutoRevealCurrentFile` 默认 `false`
- 不修改已有命令名
- 不修改已有 view id：仍然使用 `project`
- 新增命令默认通过 Command Palette 提供，不增加常驻视图按钮

### 2. 新能力失败时只降级，不阻塞主流程

- 展开状态恢复失败：仅记录日志并跳过恢复
- 当前文件定位失败：仅提示未找到，不影响文件打开
- 路径预检失败：给出更明确的错误信息，阻止进入注定失败的执行路径
- 缓存清理失败：只清理插件自有目录，不继续扩大删除范围

### 3. 新能力只在批准范围内改变行为

- `#18` 属于“减少覆盖”的修复，默认启用
- `#22`、`#23`、`#24` 的自动化部分均为显式设置或显式命令，不影响老用户默认体验
- `#25` 通过新增刷新命令解决，不偷偷清缓存

## 设计总览

本轮不重写工程解析主链路，只增加三类薄辅助层：

1. `c_cpp_properties.json` 合并层
2. 工程树状态层
3. 路径诊断与安全刷新层

所有新增逻辑优先抽为纯函数模块，`ProjectExplorer` 和 `Target` 仅负责调用与 VS Code API 对接。

## 模块设计

### A. `c_cpp_properties.json` 合并层

新增建议模块：

- `src/project/cppProperties.ts`

职责：

- 接收当前文件内容、目标配置名、插件生成的 `includePath` / `defines`
- 只更新插件自己的配置项
- 保留用户已存在的无关配置项和无关字段，例如 `compilerPath`、`browse`、`forcedInclude`
- 兼容旧配置名迁移逻辑，即从旧 `targetName` 迁移到新的 `cppConfigName`

当前风险点在 [src/extension.ts:795](/mnt/f/work_directory/Project/github/vscode_tools/keil-assistant/src/extension.ts#L795)：

- 直接重写 `includePath`
- 直接重写 `defines`
- 读取失败时用默认模板重建，容易吞掉用户原有结构

目标行为：

- 仅在插件目标配置内覆盖 `includePath` 和 `defines`
- 对用户已有字段采用保留策略
- 如果 JSON 损坏，先回退到最小可用结构，但不碰其他配置文件

### B. 工程树状态层

新增建议模块：

- `src/projectExplorer/treeState.ts`

职责：

- 计算稳定节点 ID
- 根工程列表按配置排序
- 记录 / 恢复展开状态
- 从当前活动文件路径反查对应树节点路径

为了拿到 `onDidExpandElement`、`onDidCollapseElement` 和 `reveal(...)` 能力，[src/extension.ts:1920](/mnt/f/work_directory/Project/github/vscode_tools/keil-assistant/src/extension.ts#L1920) 附近的注册方式将从单纯 `registerTreeDataProvider` 升级为“provider + `TreeView` 实例”。

这不是 UI 重构，只是对现有树加可观测与可定位能力。

稳定节点键建议：

- `project:<normalized-project-path>`
- `target:<normalized-project-path>:<target-name>`
- `group:<normalized-project-path>:<target-name>:<group-name>`
- `source:<normalized-project-path>:<target-name>:<normalized-file-path>`

说明：

- `Source` 节点 ID 主要用于 reveal 和稳定刷新
- 展开状态只记录可折叠节点，即 project / target / group

### C. 路径诊断与安全刷新层

新增建议模块：

- `src/project/pathValidation.ts`

职责：

- 在 open / build / rebuild / download 之前做统一预检
- 输出结构化错误，指明缺失的是 `UV4.exe`、工程文件、工作目录还是插件 builder

新增显式命令：

- `project.refresh`
- `project.clearCacheAndRefresh`
- `project.revealCurrentFile`

命令策略：

- `project.refresh`：关闭并重新打开当前工程，保留当前工作区和用户文件
- `project.clearCacheAndRefresh`：只清理 `globalStorageUri/<project-id>` 目录，再重新打开工程
- `project.revealCurrentFile`：根据当前活动编辑器路径在 Keil 工程树中定位；必要时可切换到包含该文件的 target，但只在显式命令触发时执行

## 需求映射

### `#18` 误报错误 / `c_cpp_properties.json` 覆盖

落地方式：

- 抽离 merge helper
- 保留用户已有字段
- 只更新插件自己的目标配置
- 对 `defines` 维持插件控制，避免旧行为失效

兼容性说明：

- 自动生成和自动选择配置行为不变
- 只是减少不必要覆盖

### `#22` 记住展开状态

落地方式：

- 增加设置 `KeilAssistant.ProjectExplorer.RememberExpandedState`
- 关闭时完全保持当前行为
- 开启后记录 project / target / group 的展开状态并在刷新后恢复

兼容性说明：

- 默认关闭，因此老用户完全无感

### `#23` 工程排序

落地方式：

- 增加设置 `KeilAssistant.ProjectExplorer.SortOrder`
- 选项：`legacy`、`name`、`path`
- 只对根工程列表生效

兼容性说明：

- 默认 `legacy`，保持当前顺序

### `#24` 当前文件定位到工程树

落地方式：

- 增加命令 `project.revealCurrentFile`
- 可选设置 `KeilAssistant.ProjectExplorer.AutoRevealCurrentFile`
- 自动定位默认关闭

兼容性说明：

- 默认不会额外切换 target、不会额外展开树

### `#25` 缓存导致项目加载失败

落地方式：

- 增加显式刷新命令
- 增加显式清理插件缓存并刷新命令
- 强化工程文件变化后的 reload 路径，让 reload 失败后仍可人工触发恢复

兼容性说明：

- 默认不新增自动清理动作
- 不删除工作区源文件和用户自定义配置

### `#26` 系统找不到指定的路径

落地方式：

- 在 open 与任务执行前统一做路径预检
- 错误文案明确指出缺失路径、当前配置项和建议修复动作

兼容性说明：

- 只把“晚失败”改成“早失败且更清楚”，不改已有成功路径

## 数据流

### `c_cpp_properties.json`

1. `Target.load()` 继续解析 include 与 define
2. `Target.updateCppProperties()` 改为调用 merge helper
3. helper 返回合并后的 JSON 对象
4. 插件写回 `.vscode/c_cpp_properties.json`
5. `applyCppConfigurationSelection()` 继续调用 `C_Cpp.ConfigurationSelect`

### 工程树状态

1. `ProjectExplorer` 初始化时创建 `TreeView<IView>`
2. 监听 expand / collapse 并在设置开启时写入 `workspaceState`
3. `getTreeItem()` 为每个节点分配稳定 `id`
4. `updateView()` 后根据设置恢复展开状态
5. 显式 reveal 命令通过路径匹配定位节点并调用 `treeView.reveal`

### 刷新与缓存清理

1. 刷新命令读取当前 active project 与 active target
2. 安全关闭项目
3. 可选删除 `projectStorageDir`
4. 重新创建 `KeilProject`
5. 恢复 active target 并刷新视图

## 风险与缓解

### 风险 1：树节点刷新后 ID 不稳定，导致展开状态错乱

缓解：

- 使用基于项目路径、target 名、group 名、文件路径的稳定键
- 排序逻辑与 ID 逻辑分离

### 风险 2：reveal 当前文件时切到错误 target

缓解：

- 先在当前 active target 内查找
- 未找到时再在其他 target 中查找
- 仅在显式命令或显式开启设置时允许切 target

### 风险 3：路径预检覆盖不全，仍然留下“系统找不到指定的路径”

缓解：

- 预检至少覆盖 `UV4.exe`、builder、工程文件、工程目录
- 对日志写入路径失败保留原始异常文本

### 风险 4：合并逻辑误伤用户配置

缓解：

- 为 merge helper 增加纯单元测试
- 严格限制更新范围到插件目标配置的 `includePath` 与 `defines`

## 测试策略

### 自动测试

新增基于 Mocha 的纯单元测试：

- `src/test/cppProperties.test.ts`
- `src/test/treeState.test.ts`
- `src/test/pathValidation.test.ts`

测试重点：

- 配置合并保留用户字段
- 稳定 ID 与排序策略
- 当前文件路径到树路径的匹配
- 路径预检错误信息

### 手工回归

- 单工程自动加载
- 多工程自动加载
- 切换 target
- build / rebuild / download
- 点击源文件打开
- 关闭所有新设置时体验保持原状

## 实施顺序

1. 先修 `c_cpp_properties.json` 合并逻辑与测试基建
2. 再补路径预检与刷新命令
3. 最后接入 `TreeView`、展开状态、排序与 reveal

这个顺序可以先解决稳定性问题，再补交互增强，并把回归面控制在最小范围内。
