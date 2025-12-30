import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ITutorialManager } from '../interfaces';
import { Tutorial, StepNode, TutorialConfig } from '../types';
import { ConfigParser } from './configParser';
import { GitService } from './gitService';

/**
 * 教程管理器 - 核心协调器
 */
export class TutorialManager implements ITutorialManager {
    private currentTutorial: Tutorial | undefined;
    private configParser: ConfigParser;
    private gitService: GitService;
    private onTutorialLoadedEmitter = new vscode.EventEmitter<Tutorial>();
    private onStepChangedEmitter = new vscode.EventEmitter<StepNode>();

    public readonly onTutorialLoaded = this.onTutorialLoadedEmitter.event;
    public readonly onStepChanged = this.onStepChangedEmitter.event;

    constructor() {
        this.configParser = new ConfigParser();
        this.gitService = new GitService();
    }

    /**
     * 加载教程
     * @param source 本地路径或远程 Git URL
     */
    async loadTutorial(source: string): Promise<Tutorial> {
        let repoPath: string;

        // 判断是本地路径还是远程 URL
        if (this.isRemoteUrl(source)) {
            // 远程 URL：克隆到临时目录
            const tempDir = path.join(this.getTempDir(), `tutorial-${Date.now()}`);
            await this.gitService.clone(source, tempDir);
            repoPath = tempDir;
        } else {
            // 本地路径
            repoPath = source;
            this.gitService.initialize(repoPath);
        }

        // 查找配置文件
        const configPath = await this.findConfigFile(repoPath);
        if (!configPath) {
            throw new Error('未找到教程配置文件 (tutorial.yaml, tutorial.yml, 或 tutorial.json)');
        }

        // 解析配置
        const config = await this.configParser.parse(configPath);

        // 验证所有 gitRef 引用
        await this.validateGitRefs(config);

        // 构建步骤树
        const steps = this.configParser.buildStepTree(config.steps);

        // 创建 Tutorial 对象
        const tutorial: Tutorial = {
            id: this.generateTutorialId(repoPath),
            name: config.name,
            description: config.description,
            rootPath: repoPath,
            steps,
            currentStepId: null
        };

        this.currentTutorial = tutorial;
        this.onTutorialLoadedEmitter.fire(tutorial);

        return tutorial;
    }

    /**
     * 获取当前教程
     */
    getCurrentTutorial(): Tutorial | undefined {
        return this.currentTutorial;
    }

    /**
     * 切换到指定步骤
     * @param stepId 步骤 ID
     */
    async navigateToStep(stepId: string): Promise<void> {
        if (!this.currentTutorial) {
            throw new Error('没有加载的教程');
        }

        const step = this.currentTutorial.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error(`步骤不存在: ${stepId}`);
        }

        // 检查脏状态
        const hasChanges = await this.gitService.hasUncommittedChanges();
        if (hasChanges) {
            const choice = await vscode.window.showWarningMessage(
                '当前有未保存的修改，是否继续切换步骤？',
                '暂存修改并继续',
                '放弃修改并继续',
                '取消'
            );

            if (choice === '暂存修改并继续') {
                await this.gitService.stash();
            } else if (choice === '放弃修改并继续') {
                // 继续，修改会被覆盖
            } else {
                return; // 取消操作
            }
        }

        // 显示加载状态
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `切换到步骤: ${step.title}`,
                cancellable: false
            },
            async () => {
                await this.gitService.checkout(step.gitRef);
            }
        );

        // 更新当前步骤
        this.currentTutorial.currentStepId = stepId;
        this.onStepChangedEmitter.fire(step);

        // 刷新编辑器中打开的文件
        await this.refreshOpenEditors();
    }

    /**
     * 获取当前步骤
     */
    getCurrentStep(): StepNode | undefined {
        if (!this.currentTutorial || !this.currentTutorial.currentStepId) {
            return undefined;
        }
        return this.currentTutorial.steps.find(
            s => s.id === this.currentTutorial!.currentStepId
        );
    }

    /**
     * 关闭教程
     */
    async closeTutorial(): Promise<void> {
        this.currentTutorial = undefined;
    }

    /**
     * 获取 Git 服务实例
     */
    getGitService(): GitService {
        return this.gitService;
    }

    /**
     * 获取配置解析器实例
     */
    getConfigParser(): ConfigParser {
        return this.configParser;
    }

    // ============================================
    // 私有方法
    // ============================================

    /**
     * 判断是否为远程 URL
     */
    private isRemoteUrl(source: string): boolean {
        return source.startsWith('http://') ||
               source.startsWith('https://') ||
               source.startsWith('git@') ||
               source.startsWith('git://');
    }

    /**
     * 获取临时目录
     */
    private getTempDir(): string {
        return path.join(require('os').tmpdir(), 'interactive-tutorial');
    }

    /**
     * 查找配置文件
     */
    private async findConfigFile(repoPath: string): Promise<string | null> {
        const configNames = ['tutorial.yaml', 'tutorial.yml', 'tutorial.json'];
        
        for (const name of configNames) {
            const configPath = path.join(repoPath, name);
            if (fs.existsSync(configPath)) {
                return configPath;
            }
        }
        
        return null;
    }

    /**
     * 验证所有 gitRef 引用
     */
    private async validateGitRefs(config: TutorialConfig): Promise<void> {
        const invalidRefs: string[] = [];

        for (const step of config.steps) {
            const exists = await this.gitService.refExists(step.gitRef);
            if (!exists) {
                invalidRefs.push(`${step.id}: ${step.gitRef}`);
            }
        }

        if (invalidRefs.length > 0) {
            throw new Error(
                `以下步骤的 Git 引用无效:\n${invalidRefs.join('\n')}`
            );
        }
    }

    /**
     * 生成教程 ID
     */
    private generateTutorialId(repoPath: string): string {
        return Buffer.from(repoPath).toString('base64').replace(/[/+=]/g, '_');
    }

    /**
     * 刷新编辑器中打开的文件
     */
    private async refreshOpenEditors(): Promise<void> {
        // 获取所有打开的文本编辑器
        for (const editor of vscode.window.visibleTextEditors) {
            const document = editor.document;
            if (!document.isDirty) {
                // 重新加载文件内容
                await vscode.commands.executeCommand('workbench.action.files.revert', document.uri);
            }
        }
    }

    /**
     * 释放资源
     */
    dispose(): void {
        this.onTutorialLoadedEmitter.dispose();
        this.onStepChangedEmitter.dispose();
    }
}

// 导出单例工厂
let instance: TutorialManager | null = null;

export function getTutorialManager(): TutorialManager {
    if (!instance) {
        instance = new TutorialManager();
    }
    return instance;
}
