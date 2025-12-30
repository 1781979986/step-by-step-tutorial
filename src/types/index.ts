// ============================================
// Core Tutorial Types
// ============================================

/**
 * 教程项目，包含多个步骤节点
 */
export interface Tutorial {
    id: string;
    name: string;
    description: string;
    rootPath: string;
    steps: StepNode[];
    currentStepId: string | null;
}

/**
 * 教程中的单个步骤节点
 */
export interface StepNode {
    id: string;
    title: string;
    description: string;
    gitRef: string;           // commit hash 或 tag
    parentId: string | null;  // 支持分支结构
    children: string[];       // 子步骤 ID 列表
    explanationPath: string;  // 讲解文件路径
}

// ============================================
// Configuration Types
// ============================================

/**
 * 教程配置文件结构
 */
export interface TutorialConfig {
    name: string;
    description: string;
    version: string;
    steps: StepConfig[];
}

/**
 * 步骤配置
 */
export interface StepConfig {
    id: string;
    title: string;
    description: string;
    gitRef: string;
    parentId?: string;
    explanation: string;  // 相对路径
}

/**
 * 配置验证结果
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

/**
 * 验证错误
 */
export interface ValidationError {
    path: string;
    message: string;
}

// ============================================
// Git Types
// ============================================

/**
 * 文件差异信息
 */
export interface FileDiff {
    filePath: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
    hunks: DiffHunk[];
}

/**
 * Diff 块
 */
export interface DiffHunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    content: string;
}

// ============================================
// Progress Types
// ============================================

/**
 * 教程进度
 */
export interface TutorialProgress {
    tutorialId: string;
    currentStepId: string | null;
    completedSteps: string[];
    lastAccessTime: number;
}

/**
 * 步骤状态
 */
export type StepStatus = 'completed' | 'current' | 'pending';

// ============================================
// Export Types
// ============================================

/**
 * 导出选项
 */
export interface ExportOptions {
    removeGitHistory: boolean;
    removeTutorialConfig: boolean;
    openInNewWindow: boolean;
}

/**
 * 代码片段
 */
export interface CodeSnippet {
    id: string;
    filePath: string;
    startLine?: number;
    endLine?: number;
    content: string;
    stepId: string;
}

/**
 * 片段导出选项
 */
export interface SnippetExportOptions {
    preserveStructure: boolean;  // 保持目录结构 vs 单文件
    outputFormat: 'files' | 'single-file';
}

// ============================================
// Code Reference Types
// ============================================

/**
 * 代码引用（讲解内容中的引用标记）
 */
export interface CodeReference {
    filePath: string;
    startLine: number;
    endLine: number;
}
