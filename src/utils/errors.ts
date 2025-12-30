import * as vscode from 'vscode';

/**
 * 教程系统错误基类
 */
export class TutorialError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: string
    ) {
        super(message);
        this.name = 'TutorialError';
    }
}

/**
 * 配置解析错误
 */
export class ConfigParseError extends TutorialError {
    constructor(message: string, details?: string) {
        super(message, 'CONFIG_PARSE_ERROR', details);
        this.name = 'ConfigParseError';
    }
}

/**
 * 配置验证错误
 */
export class ConfigValidationError extends TutorialError {
    constructor(message: string, public readonly validationErrors: string[]) {
        super(message, 'CONFIG_VALIDATION_ERROR', validationErrors.join('\n'));
        this.name = 'ConfigValidationError';
    }
}

/**
 * Git 操作错误
 */
export class GitOperationError extends TutorialError {
    constructor(
        message: string,
        public readonly operation: 'clone' | 'checkout' | 'diff' | 'stash' | 'status',
        details?: string
    ) {
        super(message, 'GIT_OPERATION_ERROR', details);
        this.name = 'GitOperationError';
    }
}

/**
 * 文件操作错误
 */
export class FileOperationError extends TutorialError {
    constructor(
        message: string,
        public readonly operation: 'read' | 'write' | 'copy' | 'delete',
        public readonly filePath: string,
        details?: string
    ) {
        super(message, 'FILE_OPERATION_ERROR', details);
        this.name = 'FileOperationError';
    }
}

/**
 * 教程未加载错误
 */
export class TutorialNotLoadedError extends TutorialError {
    constructor() {
        super('没有加载的教程，请先打开一个教程', 'TUTORIAL_NOT_LOADED');
        this.name = 'TutorialNotLoadedError';
    }
}

/**
 * 步骤不存在错误
 */
export class StepNotFoundError extends TutorialError {
    constructor(stepId: string) {
        super(`步骤不存在: ${stepId}`, 'STEP_NOT_FOUND', stepId);
        this.name = 'StepNotFoundError';
    }
}

/**
 * 统一错误处理器
 */
export class ErrorHandler {
    /**
     * 处理错误并显示用户友好的消息
     */
    static handle(error: unknown, context?: string): void {
        const message = this.formatErrorMessage(error, context);
        const actions = this.getErrorActions(error);

        if (actions.length > 0) {
            vscode.window.showErrorMessage(message, ...actions).then(action => {
                if (action) {
                    this.executeAction(action, error);
                }
            });
        } else {
            vscode.window.showErrorMessage(message);
        }

        // 记录到输出通道
        this.logError(error, context);
    }

    /**
     * 格式化错误消息
     */
    private static formatErrorMessage(error: unknown, context?: string): string {
        let message = context ? `${context}: ` : '';

        if (error instanceof TutorialError) {
            message += error.message;
        } else if (error instanceof Error) {
            message += error.message;
        } else {
            message += String(error);
        }

        return message;
    }

    /**
     * 获取错误相关的操作按钮
     */
    private static getErrorActions(error: unknown): string[] {
        if (error instanceof ConfigParseError) {
            return ['查看配置要求'];
        }

        if (error instanceof GitOperationError) {
            if (error.operation === 'clone') {
                return ['检查网络连接', '检查 URL'];
            }
            if (error.operation === 'checkout') {
                return ['暂存修改', '放弃修改'];
            }
        }

        if (error instanceof TutorialNotLoadedError) {
            return ['打开教程'];
        }

        return [];
    }

    /**
     * 执行错误操作
     */
    private static executeAction(action: string, error: unknown): void {
        switch (action) {
            case '查看配置要求':
                this.showConfigRequirements();
                break;
            case '打开教程':
                vscode.commands.executeCommand('interactiveTutorial.openTutorial');
                break;
            case '暂存修改':
                // 触发暂存操作
                break;
            case '放弃修改':
                // 触发放弃修改操作
                break;
        }
    }

    /**
     * 显示配置要求
     */
    private static showConfigRequirements(): void {
        const content = `# 教程配置文件要求

教程配置文件必须命名为 \`tutorial.yaml\`、\`tutorial.yml\` 或 \`tutorial.json\`，放置在仓库根目录。

## 必要字段

- \`name\`: 教程名称（字符串）
- \`description\`: 教程描述（字符串）
- \`version\`: 版本号（字符串）
- \`steps\`: 步骤数组（至少包含一个步骤）

## 步骤字段

每个步骤必须包含：
- \`id\`: 唯一标识符（字符串）
- \`title\`: 步骤标题（字符串）
- \`gitRef\`: Git 引用（commit hash 或 tag）
- \`explanation\`: 讲解文件路径（相对路径）

可选字段：
- \`description\`: 步骤描述
- \`parentId\`: 父步骤 ID（用于分支结构）

## 示例

\`\`\`yaml
name: "React 入门教程"
description: "从零开始学习 React"
version: "1.0.0"

steps:
  - id: "step-1"
    title: "项目初始化"
    gitRef: "step-1"
    explanation: "docs/step-1.md"
\`\`\`
`;

        vscode.workspace.openTextDocument({ content, language: 'markdown' })
            .then(doc => vscode.window.showTextDocument(doc));
    }

    /**
     * 记录错误日志
     */
    private static logError(error: unknown, context?: string): void {
        const outputChannel = vscode.window.createOutputChannel('Interactive Tutorial');
        
        outputChannel.appendLine(`[${new Date().toISOString()}] Error${context ? ` (${context})` : ''}:`);
        
        if (error instanceof TutorialError) {
            outputChannel.appendLine(`  Code: ${error.code}`);
            outputChannel.appendLine(`  Message: ${error.message}`);
            if (error.details) {
                outputChannel.appendLine(`  Details: ${error.details}`);
            }
        } else if (error instanceof Error) {
            outputChannel.appendLine(`  Message: ${error.message}`);
            if (error.stack) {
                outputChannel.appendLine(`  Stack: ${error.stack}`);
            }
        } else {
            outputChannel.appendLine(`  ${String(error)}`);
        }

        outputChannel.appendLine('');
    }
}

/**
 * 包装异步函数以统一处理错误
 */
export function withErrorHandling<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
): (...args: T) => Promise<R | undefined> {
    return async (...args: T): Promise<R | undefined> => {
        try {
            return await fn(...args);
        } catch (error) {
            ErrorHandler.handle(error, context);
            return undefined;
        }
    };
}
