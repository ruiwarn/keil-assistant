# Keil Assistant New

**注意：这是一个由社区接手维护的版本，从 v2.0.0 开始。原始项目已不再更新。**

## 简述 📑

VSCode 上的 Keil 辅助工具，与 C/C++ 插件配合使用。

能够为 Keil 项目提供语法高亮、代码片段的功能，并支持对 Keil 项目进行编译、下载。

**仅支持 Keil uVision 5 及以上版本**

**仅支持 Windows 平台**

![preview](./res/preview/preview.png)

***

## 功能特性🎉

- 加载 Keil C51/ARM 项目，并以 Keil 项目资源管理器的展示方式显示项目视图
- 自动监视 Keil 项目文件的变化，及时更新项目视图
- 通过调用 Keil 命令行接口实现编译，重新编译，烧录 Keil 项目
- 自动生成 `c_cpp_properties.json` 文件，使 C/C++ 插件的语法分析能正常进行

***

## 用法 📖

### 准备工作

1.  安装 [C/C++ 插件](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
2.  进入 Keil Assistant New 插件设置，设置好 Keil 可执行文件 `UV4.exe` 的绝对路径

    ![setting](./res/preview/setting.png)

***

### 开始使用 🏃‍♀️

1.  在 Keil uVision 中创建好项目，添加好文件，配置好头文件路径等。
2.  在 VSCode 中，点击侧边栏 Keil Assistant New 视图中的 **打开项目** 图标，或者直接使用 VSCode 打开 Keil 项目文件（`.uvproj` 或 `.uvprojx`）所在的目录。插件会自动加载 Keil 项目。

    ![load](./res/preview/load.png)

### 常用操作

-   **编译、下载、重新编译**：视图标题栏提供了 3 个按钮，分别对应这些操作。

    ![build](./res/preview/build.png)

-   **保存和刷新**：在 Keil uVision 中添加/删除源文件、更改项目配置后，点击 **保存所有 (Save All)**。Keil Assistant New 检测到项目变化后会自动刷新项目视图。

    ![keil_save_all](./res/preview/keil_save_all.png)

-   **打开源文件**：单击项目视图中的源文件将以预览模式打开，双击将以非预览模式打开。

    ![open_file](./res/preview/open_file.png)

-   **切换 C/C++ 插件配置**：如果项目包含多个 Target，插件会为每个 Target 生成一个 C/C++ 配置。点击 VSCode 状态栏右下角的配置名称可以在多个配置间切换，以获得对应 Target 的智能提示。

    ![cpp_config](./res/preview/cpp_config.png)

-   **切换 Keil Target**：点击项目视图中项目名称旁边的切换按钮，可以在多个 Keil Target 之间切换活动目标，用于编译和下载。

    ![active_target](./res/preview/active_target.png)

-   **展开引用**：编译完成后，可以点击源文件项旁边的箭头图标展开其引用的头文件（仅支持 ARM 项目）。

    ![show_referance](./res/preview/ref_show.png)

***

### 其他设置

-   **工作区设置：项目排除列表 (`KeilAssistant.Project.ExcludeList`)**
    当某个目录下存在多个 Keil 项目时，插件默认会尝试加载所有项目。通过此设置，可以指定需要排除的 Keil 项目文件名（例如 `template.uvprojx`），防止它们被自动加载。
    **默认排除列表**:
    ```json
    [
        "template.uvproj",
        "template.uvprojx"
    ]
    ```
-   **工作区设置：项目文件位置 (`KeilAssistant.Project.FileLocationList`)**
    默认情况下，插件会在工作区根目录查找 Keil 项目文件。如果你的项目文件不在根目录，可以通过此设置指定包含项目文件的子目录路径列表。

***

## 问题反馈

如有问题或建议，请通过 GitHub Issues 反馈。
