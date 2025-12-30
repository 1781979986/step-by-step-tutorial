import * as vscode from 'vscode';
import { StepNode, StepStatus, Tutorial } from '../types';
import { ProgressTracker } from '../services/progressTracker';

/**
 * 步骤树项
 */
export class StepTreeItem extends vscode.TreeItem {
    constructor(
        public readonly stepNode: StepNode,
        public readonly status: StepStatus,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(stepNode.title, collapsibleState);

        this.id = stepNode.id;
        this.description = stepNode.description;
        this.tooltip = this.createTooltip();
        this.iconPath = this.getIcon();
        this.contextValue = `step-${status}`;

        // 设置点击命令
        this.command = {
            command: 'interactiveTutorial.navigateToStep',
            title: '切换到此步骤',
            arguments: [stepNode.id]
        };
    }

    private createTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.stepNode.title}**\n\n`);
        if (this.stepNode.description) {
            md.appendMarkdown(`${this.stepNode.description}\n\n`);
        }
        md.appendMarkdown(`Git Ref: \`${this.stepNode.gitRef}\`\n\n`);
        md.appendMarkdown(`状态: ${this.getStatusText()}`);
        return md;
    }

    private getStatusText(): string {
        switch (this.status) {
            case 'completed': return '✅ 已完成';
            case 'current': return '📍 当前步骤';
            case 'pending': return '⏳ 待完成';
        }
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.status) {
            case 'completed':
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            case 'current':
                return new vscode.ThemeIcon('arrow-right', new vscode.ThemeColor('charts.blue'));
            case 'pending':
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}

/**
 * 步骤树数据提供器
 */
export class StepTreeProvider implements vscode.TreeDataProvider<StepTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<StepTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private tutorial: Tutorial | undefined;
    private progressTracker: ProgressTracker;
    private stepMap: Map<string, StepNode> = new Map();

    constructor(progressTracker: ProgressTracker) {
        this.progressTracker = progressTracker;
    }

    /**
     * 设置当前教程
     */
    setTutorial(tutorial: Tutorial | undefined): void {
        this.tutorial = tutorial;
        this.stepMap.clear();

        if (tutorial) {
            for (const step of tutorial.steps) {
                this.stepMap.set(step.id, step);
            }
        }

        this.refresh();
    }

    /**
     * 刷新树视图
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 获取树项
     */
    getTreeItem(element: StepTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * 获取子节点
     */
    getChildren(element?: StepTreeItem): Thenable<StepTreeItem[]> {
        if (!this.tutorial) {
            return Promise.resolve([]);
        }

        if (!element) {
            // 根节点：返回没有父节点的步骤
            const rootSteps = this.tutorial.steps.filter(s => !s.parentId);
            return Promise.resolve(this.createTreeItems(rootSteps));
        }

        // 返回子步骤
        const childIds = element.stepNode.children;
        const childSteps = childIds
            .map(id => this.stepMap.get(id))
            .filter((s): s is StepNode => s !== undefined);

        return Promise.resolve(this.createTreeItems(childSteps));
    }

    /**
     * 获取父节点
     */
    getParent(element: StepTreeItem): vscode.ProviderResult<StepTreeItem> {
        if (!element.stepNode.parentId) {
            return null;
        }

        const parentStep = this.stepMap.get(element.stepNode.parentId);
        if (!parentStep) {
            return null;
        }

        const status = this.getStepStatus(parentStep.id);
        const hasChildren = parentStep.children.length > 0;

        return new StepTreeItem(
            parentStep,
            status,
            hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
        );
    }

    /**
     * 创建树项列表
     */
    private createTreeItems(steps: StepNode[]): StepTreeItem[] {
        return steps.map(step => {
            const status = this.getStepStatus(step.id);
            const hasChildren = step.children.length > 0;

            return new StepTreeItem(
                step,
                status,
                hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
            );
        });
    }

    /**
     * 获取步骤状态
     */
    private getStepStatus(stepId: string): StepStatus {
        if (!this.tutorial) {
            return 'pending';
        }
        return this.progressTracker.getStepStatus(this.tutorial.id, stepId);
    }

    /**
     * 释放资源
     */
    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
