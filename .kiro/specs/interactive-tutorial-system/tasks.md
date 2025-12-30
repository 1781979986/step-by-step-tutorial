# Implementation Plan: Interactive Tutorial System

## Overview

VS Code 插件实现，通过 Git 版本控制实现教程步骤流转。采用模块化架构，使用 TypeScript + simple-git + Webview 技术栈。

## Tasks

- [x] 1. 项目初始化与基础架构
  - [x] 1.1 初始化 VS Code 插件项目结构
    - 使用 yo code 生成器创建 TypeScript 插件模板
    - 配置 package.json 中的 activationEvents 和 contributes
    - 设置 tsconfig.json 和 ESLint 配置
    - _Requirements: 1.1_

  - [x] 1.2 安装核心依赖并配置测试框架
    - 安装 simple-git、js-yaml 依赖
    - 配置 Mocha + Chai 单元测试
    - 配置 fast-check 属性测试库
    - _Requirements: 8.1_

  - [x] 1.3 创建核心接口和类型定义
    - 定义 Tutorial、StepNode、TutorialConfig 等核心接口
    - 定义 FileDiff、DiffHunk、CodeSnippet 等数据类型
    - 定义各模块的接口（ITutorialManager、IGitService 等）
    - _Requirements: 8.2, 8.4_

- [x] 2. Config Parser 模块实现
  - [x] 2.1 实现配置文件解析器
    - 支持 YAML 和 JSON 格式解析
    - 实现 parse() 方法读取并解析 tutorial.yaml/json
    - 构建步骤树结构（支持线性和分支）
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.2 实现配置验证逻辑
    - 验证必要字段存在性（name、steps、gitRef 等）
    - 验证步骤 ID 唯一性和 parentId 引用有效性
    - 返回详细的 ValidationResult 错误信息
    - _Requirements: 1.2, 8.2_

  - [ ]* 2.3 编写 Property 1 属性测试：配置解析往返一致性
    - **Property 1: 配置解析往返一致性**
    - **Validates: Requirements 1.2, 8.1, 8.2**

  - [ ]* 2.4 编写 Property 2 属性测试：无效配置拒绝
    - **Property 2: 无效配置拒绝**
    - **Validates: Requirements 1.2**

  - [ ]* 2.5 编写 Property 3 属性测试：步骤树结构保持
    - **Property 3: 步骤树结构保持**
    - **Validates: Requirements 8.2, 8.3**

- [x] 3. Git Service 模块实现
  - [x] 3.1 实现 Git 基础操作
    - 使用 simple-git 封装 clone、checkout 操作
    - 实现 hasUncommittedChanges() 检测脏状态
    - 实现 stash() 和 stashPop() 暂存操作
    - _Requirements: 1.1, 1.4, 2.1, 2.2_

  - [x] 3.2 实现 Diff 计算功能
    - 实现 getDiff() 获取两个 commit 之间的差异
    - 解析 diff 输出为 FileDiff 结构
    - 计算文件状态（added/modified/deleted/renamed）和行数统计
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ]* 3.3 编写 Property 4 属性测试：步骤切换正确性
    - **Property 4: 步骤切换正确性**
    - **Validates: Requirements 2.1, 8.4**

  - [ ]* 3.4 编写 Property 5 属性测试：脏状态阻止切换
    - **Property 5: 脏状态阻止切换**
    - **Validates: Requirements 2.2**

  - [ ]* 3.5 编写 Property 6 属性测试：Diff 计算正确性
    - **Property 6: Diff 计算正确性**
    - **Validates: Requirements 3.1, 3.3**

- [x] 4. Checkpoint - 核心服务层验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 5. Tutorial Manager 实现
  - [x] 5.1 实现教程加载功能
    - 实现 loadTutorial() 支持本地路径和远程 URL
    - 调用 ConfigParser 解析配置
    - 验证所有 gitRef 引用有效性
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 5.2 实现步骤导航功能
    - 实现 navigateToStep() 切换到指定步骤
    - 检查脏状态并提示用户处理
    - 触发 UI 更新和文件刷新
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 5.3 实现教程生命周期管理
    - 实现 getCurrentTutorial()、getCurrentStep()
    - 实现 closeTutorial() 清理资源
    - _Requirements: 1.1_

- [x] 6. Progress Tracker 模块实现
  - [x] 6.1 实现进度追踪核心逻辑
    - 实现 getProgress()、markStepCompleted()、setCurrentStep()
    - 计算步骤状态（completed/current/pending）
    - 实现 resetProgress() 重置功能
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 实现进度持久化
    - 使用 VS Code globalState 存储进度数据
    - 实现进度数据的序列化和反序列化
    - 支持重新打开教程时恢复进度
    - _Requirements: 5.3, 5.4_

  - [ ]* 6.3 编写 Property 8 属性测试：进度持久化往返
    - **Property 8: 进度持久化往返**
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 6.4 编写 Property 9 属性测试：进度状态一致性
    - **Property 9: 进度状态一致性**
    - **Validates: Requirements 5.1, 5.2**

- [x] 7. Checkpoint - 业务逻辑层验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 8. UI Layer - 步骤树视图
  - [x] 8.1 实现 StepTreeProvider
    - 实现 TreeDataProvider 接口
    - 创建 StepTreeItem 显示步骤信息和状态图标
    - 实现 refresh() 方法响应数据变化
    - _Requirements: 1.3, 5.1_

  - [x] 8.2 注册 TreeView 和命令
    - 在 package.json 中注册 views 和 viewsContainers
    - 注册步骤点击命令触发导航
    - _Requirements: 2.1_

- [x] 9. UI Layer - Diff Viewer
  - [x] 9.1 实现 Diff 展示功能
    - 调用 VS Code 内置 Diff Editor API
    - 实现文件列表展示当前步骤的所有改动
    - 支持点击文件打开对比视图
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 9.2 处理首步骤特殊情况
    - 第一个步骤显示完整文件内容（与空状态对比）
    - _Requirements: 3.4_

- [x] 10. UI Layer - 讲解面板 (Webview)
  - [x] 10.1 实现 Explanation Panel Webview
    - 创建 WebviewPanel 显示讲解内容
    - 实现 Markdown 渲染（支持代码块语法高亮）
    - 实现 show() 和 hide() 方法
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 10.2 实现代码引用跳转功能
    - 解析 `<!-- code-ref: path:line-line -->` 标记
    - 实现点击跳转到对应文件位置
    - _Requirements: 4.4_

  - [ ]* 10.3 编写 Property 7 属性测试：代码引用解析正确性
    - **Property 7: 代码引用解析正确性**
    - **Validates: Requirements 4.4**

  - [x] 10.4 (可选) AI 辅助讲解入口
    - WHERE AI 功能启用时显示问答入口
    - _Requirements: 4.5_

- [x] 11. Checkpoint - UI 层验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 12. Export Module 实现
  - [x] 12.1 实现项目导出功能
    - 实现 exportProject() 复制当前步骤项目文件
    - 移除 .git 目录和 tutorial.yaml 配置
    - 提供"在新窗口打开"选项
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 12.2 编写 Property 10 属性测试：项目导出完整性
    - **Property 10: 项目导出完整性**
    - **Validates: Requirements 6.1, 6.2**

  - [x] 12.3 实现代码片段管理
    - 实现 addSnippet()、removeSnippet()、getSnippetList()
    - 在侧边栏显示已选择的片段列表
    - 实现 clearSnippetList() 清空功能
    - _Requirements: 7.1, 7.2_

  - [x] 12.4 实现片段导出功能
    - 实现 exportSnippets() 导出选中片段
    - 支持保持目录结构或合并为单文件
    - _Requirements: 7.3, 7.4_

  - [ ]* 12.5 编写 Property 11 属性测试：片段导出正确性
    - **Property 11: 片段导出正确性**
    - **Validates: Requirements 7.1, 7.3, 7.4**

- [x] 13. 命令注册与集成
  - [x] 13.1 注册插件命令
    - 注册"打开教程"命令（支持选择本地/远程）
    - 注册"导出当前进度"命令
    - 注册"导出代码片段"命令
    - _Requirements: 1.1, 1.4, 6.1, 7.3_

  - [x] 13.2 实现加载状态指示
    - 步骤切换时显示进度条
    - 长时间操作显示状态栏提示
    - _Requirements: 2.3_

- [x] 14. 错误处理完善
  - [x] 14.1 实现统一错误处理
    - 配置解析错误提示
    - Git 操作错误处理（克隆失败、checkout 冲突等）
    - 导出错误处理（权限、空间不足等）
    - _Requirements: 1.2, 2.2_

- [x] 15. Final Checkpoint - 完整功能验证
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 开发
- 每个任务都引用了具体的需求条目以确保可追溯性
- Checkpoint 任务用于阶段性验证
- 属性测试验证核心正确性属性
- 单元测试覆盖边界情况和错误条件
