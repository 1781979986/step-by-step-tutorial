import {
    Tutorial,
    StepNode,
    TutorialConfig,
    ValidationResult,
    FileDiff,
    TutorialProgress,
    ExportOptions,
    CodeSnippet,
    SnippetExportOptions
} from '../types';

// ============================================
// Tutorial Manager Interface
// ============================================

/**
 * 教程管理器 - 核心协调器
 */
export interface ITutorialManager {
    /**
     * 加载教程
     * @param source 本地路径或远程 Git URL
     */
    loadTutorial(source: string): Promise<Tutorial>;

    /**
     * 获取当前教程
     */
    getCurrentTutorial(): Tutorial | undefined;

    /**
     * 切换到指定步骤
     * @param stepId 步骤 ID
     */
    navigateToStep(stepId: string): Promise<void>;

    /**
     * 获取当前步骤
     */
    getCurrentStep(): StepNode | undefined;

    /**
     * 关闭教程
     */
    closeTutorial(): Promise<void>;
}

// ============================================
// Git Service Interface
// ============================================

/**
 * Git 操作服务
 */
export interface IGitService {
    /**
     * 克隆仓库
     */
    clone(url: string, targetPath: string): Promise<void>;

    /**
     * 检出到指定引用
     */
    checkout(ref: string): Promise<void>;

    /**
     * 获取两个引用之间的 diff
     */
    getDiff(fromRef: string, toRef: string): Promise<FileDiff[]>;

    /**
     * 检查是否有未提交的修改
     */
    hasUncommittedChanges(): Promise<boolean>;

    /**
     * 暂存当前修改
     */
    stash(): Promise<void>;

    /**
     * 恢复暂存的修改
     */
    stashPop(): Promise<void>;
}

// ============================================
// Config Parser Interface
// ============================================

/**
 * 配置解析器
 */
export interface IConfigParser {
    /**
     * 解析教程配置文件
     */
    parse(configPath: string): Promise<TutorialConfig>;

    /**
     * 验证配置格式
     */
    validate(config: unknown): ValidationResult;
}

// ============================================
// Progress Tracker Interface
// ============================================

/**
 * 进度追踪器
 */
export interface IProgressTracker {
    /**
     * 获取教程进度
     */
    getProgress(tutorialId: string): TutorialProgress;

    /**
     * 标记步骤完成
     */
    markStepCompleted(tutorialId: string, stepId: string): void;

    /**
     * 设置当前步骤
     */
    setCurrentStep(tutorialId: string, stepId: string): void;

    /**
     * 重置进度
     */
    resetProgress(tutorialId: string): void;
}

// ============================================
// Export Module Interface
// ============================================

/**
 * 导出模块
 */
export interface IExportModule {
    /**
     * 导出当前项目状态
     */
    exportProject(targetPath: string, options: ExportOptions): Promise<void>;

    /**
     * 添加代码片段到导出列表
     */
    addSnippet(snippet: CodeSnippet): void;

    /**
     * 移除代码片段
     */
    removeSnippet(snippetId: string): void;

    /**
     * 获取当前导出列表
     */
    getSnippetList(): CodeSnippet[];

    /**
     * 导出选中的代码片段
     */
    exportSnippets(targetPath: string, options: SnippetExportOptions): Promise<void>;

    /**
     * 清空导出列表
     */
    clearSnippetList(): void;
}

// ============================================
// Explanation Panel Interface
// ============================================

/**
 * 讲解面板
 */
export interface IExplanationPanel {
    /**
     * 显示讲解内容
     */
    show(content: string, stepTitle: string): void;

    /**
     * 隐藏面板
     */
    hide(): void;

    /**
     * 处理代码引用点击
     */
    onCodeReferenceClick(callback: (filePath: string, line: number) => void): void;
}
