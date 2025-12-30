# Requirements Document

## Introduction

交互式教程系统（Interactive Tutorial System）是一个 VS Code 插件，旨在解决传统编程教程（博客、视频）的痛点。通过结合 Git 版本控制实现教程步骤的流转，提供代码 Diff 对比、步骤讲解、以及灵活的导出功能，让学习者能够按需获取知识，高效实践。

## Glossary

- **Tutorial_System**: 交互式教程系统，VS Code 插件的核心模块
- **Tutorial**: 一个完整的教程项目，包含多个步骤节点
- **Step_Node**: 教程中的单个步骤节点，对应 Git 的一个 commit 或 tag
- **Step_Tree**: 教程的步骤结构，可以是线性或分支形式
- **Diff_Viewer**: 代码差异查看器，展示当前步骤相对于上一步骤的改动
- **Explanation_Panel**: 讲解面板，展示当前步骤的教程内容
- **Progress_Tracker**: 进度追踪器，记录学习者当前所在步骤
- **Export_Module**: 导出模块，支持导出完整项目或部分代码片段

## Requirements

### Requirement 1: 教程加载与初始化

**User Story:** As a 学习者, I want to 在 VS Code 中加载一个教程项目, so that 我可以开始交互式学习。

#### Acceptance Criteria

1. WHEN 用户通过命令面板选择"打开教程"并选择一个教程仓库 THEN THE Tutorial_System SHALL 克隆或打开该仓库并解析教程配置文件
2. WHEN 教程配置文件格式无效 THEN THE Tutorial_System SHALL 显示错误提示并说明配置要求
3. WHEN 教程成功加载 THEN THE Tutorial_System SHALL 在侧边栏显示步骤树结构
4. THE Tutorial_System SHALL 支持从本地路径或远程 Git URL 加载教程

### Requirement 2: 步骤导航与流转

**User Story:** As a 学习者, I want to 点击步骤节点切换到对应的项目状态, so that 我可以查看每个阶段的代码。

#### Acceptance Criteria

1. WHEN 用户点击步骤树中的某个节点 THEN THE Tutorial_System SHALL 通过 Git checkout 将项目切换到该步骤对应的 commit
2. WHEN 用户当前有未保存的修改 THEN THE Tutorial_System SHALL 提示用户保存或暂存修改后再切换
3. WHILE 步骤切换进行中 THEN THE Tutorial_System SHALL 显示加载状态指示器
4. WHEN 步骤切换完成 THEN THE Tutorial_System SHALL 自动刷新编辑器中打开的文件

### Requirement 3: 代码差异展示

**User Story:** As a 学习者, I want to 查看当前步骤相对于上一步骤的代码改动, so that 我可以理解每一步做了什么。

#### Acceptance Criteria

1. WHEN 用户切换到某个步骤 THEN THE Diff_Viewer SHALL 自动展示该步骤与前一步骤的代码差异
2. WHEN 用户点击 Diff 中的某个文件 THEN THE Diff_Viewer SHALL 在编辑器中打开该文件的对比视图
3. THE Diff_Viewer SHALL 高亮显示新增、删除和修改的代码行
4. WHEN 当前步骤是第一个步骤 THEN THE Diff_Viewer SHALL 显示初始文件创建的完整内容

### Requirement 4: 步骤讲解展示

**User Story:** As a 学习者, I want to 阅读当前步骤的讲解内容, so that 我可以理解代码改动的目的和原理。

#### Acceptance Criteria

1. WHEN 用户切换到某个步骤 THEN THE Explanation_Panel SHALL 在 Webview 中显示该步骤的讲解内容
2. THE Explanation_Panel SHALL 支持 Markdown 格式的讲解内容渲染
3. THE Explanation_Panel SHALL 支持代码块语法高亮
4. WHEN 讲解内容中包含代码引用 THEN THE Explanation_Panel SHALL 支持点击跳转到对应文件位置
5. WHERE AI 辅助讲解功能启用 THEN THE Explanation_Panel SHALL 提供基于当前代码的 AI 问答入口

### Requirement 5: 进度追踪

**User Story:** As a 学习者, I want to 看到我的学习进度, so that 我知道已完成和待完成的步骤。

#### Acceptance Criteria

1. THE Progress_Tracker SHALL 在步骤树中标记已完成、当前和未完成的步骤
2. WHEN 用户完成一个步骤并切换到下一步骤 THEN THE Progress_Tracker SHALL 自动将前一步骤标记为已完成
3. THE Progress_Tracker SHALL 将进度数据持久化存储到本地
4. WHEN 用户重新打开同一教程 THEN THE Progress_Tracker SHALL 恢复之前的进度状态

### Requirement 6: 项目导出

**User Story:** As a 学习者, I want to 导出当前进度的项目代码, so that 我可以在此基础上继续开发。

#### Acceptance Criteria

1. WHEN 用户选择"导出当前进度" THEN THE Export_Module SHALL 将当前步骤的完整项目复制到用户指定的目录
2. THE Export_Module SHALL 在导出时移除教程相关的配置文件和 Git 历史
3. WHEN 导出完成 THEN THE Export_Module SHALL 提示用户导出路径并提供"在新窗口打开"选项

### Requirement 7: 代码片段导出

**User Story:** As a 学习者, I want to 选择并导出教程中的部分代码片段, so that 我可以将特定功能集成到自己的项目中。

#### Acceptance Criteria

1. WHEN 用户在 Diff 视图中选择特定文件或代码块 THEN THE Export_Module SHALL 允许用户将选中内容添加到导出列表
2. THE Export_Module SHALL 在侧边栏显示当前已选择的导出片段列表
3. WHEN 用户确认导出片段 THEN THE Export_Module SHALL 将所有选中的代码片段打包导出
4. THE Export_Module SHALL 支持导出为单个文件或保持原目录结构

### Requirement 8: 教程配置格式

**User Story:** As a 教程作者, I want to 使用简单的配置格式定义教程结构, so that 我可以轻松创建交互式教程。

#### Acceptance Criteria

1. THE Tutorial_System SHALL 支持 JSON 或 YAML 格式的教程配置文件
2. THE Tutorial_System SHALL 解析配置文件中定义的步骤树结构
3. THE Tutorial_System SHALL 支持线性和分支两种步骤结构
4. WHEN 配置文件中定义了步骤的 Git 引用（commit hash 或 tag） THEN THE Tutorial_System SHALL 使用该引用进行步骤切换
5. THE Tutorial_System SHALL 支持在配置中指定每个步骤的讲解内容文件路径
