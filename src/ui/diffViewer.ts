import * as vscode from 'vscode';
import * as path from 'path';
import { FileDiff, StepNode } from '../types';
import { GitService } from '../services/gitService';

/**
 * Diff 文件项
 */
export class DiffFileItem extends vscode.TreeItem {
    constructor(
        public readonly fileDiff: FileDiff,
        public readonly repoPath: string,
        public readonly fromRef: string,
        public readonly toRef: string
    ) {
        super(path.basename(fileDiff.filePath), vscode.TreeItemCollapsibleState.None);

        this.description = this.getDescription();
        this.tooltip = this.createTooltip();
        this.iconPath = this.getIcon();
        this.contextValue = `diff-file-${fileDiff.status}`;

        // 设置点击命令打开 diff 视图
        this.command = {
            command: 'interactiveTutorial.openDiff',
            title: '查看差异',
            arguments: [this]
        };
    }

    private getDescription(): string {
        const dir = path.dirname(this.fileDiff.filePath);
        const stats = `+${this.fileDiff.additions} -${this.fileDiff.deletions}`;
        return dir === '.' ? stats : `${dir} ${stats}`;
    }

    private createTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.fileDiff.filePath}**\n\n`);
        md.appendMarkdown(`状态: ${this.getStatusText()}\n\n`);
        md.appendMarkdown(`新增: ${this.fileDiff.additions} 行\n\n`);
        md.appendMarkdown(`删除: ${this.fileDiff.deletions} 行`);
        return md;
    }

    private getStatusText(): string {
        switch (this.fileDiff.status) {
            case 'added': return '新增文件';
            case 'modified': return '修改';
            case 'deleted': return '删除';
            case 'renamed': return '重命名';
        }
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.fileDiff.status) {
            case 'added':
                return new vscode.ThemeIcon('diff-added', new vscode.ThemeColor('charts.green'));
            case 'modified':
                return new vscode.ThemeIcon('diff-modified', new vscode.ThemeColor('charts.yellow'));
            case 'deleted':
                return new vscode.ThemeIcon('diff-removed', new vscode.ThemeColor('charts.red'));
            case 'renamed':
                return new vscode.ThemeIcon('diff-renamed', new vscode.ThemeColor('charts.blue'));
        }
    }
}

/**
 * Diff 文件列表提供器
 */
export class DiffFileListProvider implements vscode.TreeDataProvider<DiffFileItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<DiffFileItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private fileDiffs: FileDiff[] = [];
    private repoPath: string = '';
    private fromRef: string = '';
    private toRef: string = '';

    /**
     * 设置 diff 数据
     */
    setDiffData(
        fileDiffs: FileDiff[],
        repoPath: string,
        fromRef: string,
        toRef: string
    ): void {
        this.fileDiffs = fileDiffs;
        this.repoPath = repoPath;
        this.fromRef = fromRef;
        this.toRef = toRef;
        this.refresh();
    }

    /**
     * 清空 diff 数据
     */
    clear(): void {
        this.fileDiffs = [];
        this.refresh();
    }

    /**
     * 刷新视图
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DiffFileItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<DiffFileItem[]> {
        const items = this.fileDiffs.map(
            diff => new DiffFileItem(diff, this.repoPath, this.fromRef, this.toRef)
        );
        return Promise.resolve(items);
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}

/**
 * Diff 查看器管理器
 */
export class DiffViewerManager {
    private diffFileListProvider: DiffFileListProvider;
    private gitService: GitService;

    constructor(gitService: GitService) {
        this.gitService = gitService;
        this.diffFileListProvider = new DiffFileListProvider();
    }

    /**
     * 获取文件列表提供器
     */
    getFileListProvider(): DiffFileListProvider {
        return this.diffFileListProvider;
    }

    /**
     * 显示步骤的 diff
     * @param currentStep 当前步骤
     * @param previousStep 上一步骤（可为空表示第一步）
     * @param repoPath 仓库路径
     */
    async showStepDiff(
        currentStep: StepNode,
        previousStep: StepNode | null,
        repoPath: string
    ): Promise<void> {
        const fromRef = previousStep?.gitRef || '';
        const toRef = currentStep.gitRef;

        try {
            const diffs = await this.gitService.getDiff(fromRef, toRef);
            this.diffFileListProvider.setDiffData(diffs, repoPath, fromRef, toRef);
        } catch (error) {
            vscode.window.showErrorMessage(
                `获取 diff 失败: ${error instanceof Error ? error.message : String(error)}`
            );
            this.diffFileListProvider.clear();
        }
    }

    /**
     * 打开文件的 diff 视图
     */
    async openFileDiff(item: DiffFileItem): Promise<void> {
        const repoPath = item.repoPath;
        const filePath = item.fileDiff.filePath;

        // 构建 Git URI
        const leftUri = item.fromRef
            ? this.createGitUri(repoPath, filePath, item.fromRef)
            : vscode.Uri.parse('untitled:empty');

        const rightUri = this.createGitUri(repoPath, filePath, item.toRef);

        const title = `${path.basename(filePath)} (${item.fromRef || '空'} ↔ ${item.toRef})`;

        await vscode.commands.executeCommand(
            'vscode.diff',
            leftUri,
            rightUri,
            title
        );
    }

    /**
     * 创建 Git URI（用于显示特定版本的文件）
     */
    private createGitUri(repoPath: string, filePath: string, ref: string): vscode.Uri {
        // 使用 VS Code 的 git 扩展 URI 格式
        const fullPath = path.join(repoPath, filePath);
        return vscode.Uri.file(fullPath).with({
            scheme: 'git',
            query: JSON.stringify({ ref, path: fullPath })
        });
    }

    /**
     * 清空 diff 视图
     */
    clear(): void {
        this.diffFileListProvider.clear();
    }

    dispose(): void {
        this.diffFileListProvider.dispose();
    }
}
