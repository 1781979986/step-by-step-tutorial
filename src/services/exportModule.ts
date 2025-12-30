import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IExportModule } from '../interfaces';
import { ExportOptions, CodeSnippet, SnippetExportOptions } from '../types';

/**
 * 导出模块 - 处理项目和代码片段导出
 */
export class ExportModule implements IExportModule {
    private snippetList: CodeSnippet[] = [];
    private onSnippetListChangedEmitter = new vscode.EventEmitter<CodeSnippet[]>();

    public readonly onSnippetListChanged = this.onSnippetListChangedEmitter.event;

    /**
     * 导出当前项目状态
     * @param targetPath 目标路径
     * @param options 导出选项
     */
    async exportProject(targetPath: string, options: ExportOptions): Promise<void> {
        const tutorial = this.getCurrentTutorial();
        if (!tutorial) {
            throw new Error('没有加载的教程');
        }

        const sourcePath = tutorial.rootPath;

        // 创建目标目录
        await fs.promises.mkdir(targetPath, { recursive: true });

        // 复制文件
        await this.copyDirectory(sourcePath, targetPath, (filePath) => {
            const relativePath = path.relative(sourcePath, filePath);
            
            // 过滤 .git 目录
            if (options.removeGitHistory && relativePath.startsWith('.git')) {
                return false;
            }

            // 过滤教程配置文件
            if (options.removeTutorialConfig) {
                const fileName = path.basename(filePath);
                if (['tutorial.yaml', 'tutorial.yml', 'tutorial.json'].includes(fileName)) {
                    return false;
                }
            }

            return true;
        });

        // 显示完成提示
        const openAction = '在新窗口打开';
        const actions = options.openInNewWindow ? [openAction, '确定'] : ['确定'];
        const result = await vscode.window.showInformationMessage(
            `项目已导出到: ${targetPath}`,
            ...actions
        );

        if (result === openAction) {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetPath), true);
        }
    }

    /**
     * 添加代码片段到导出列表
     */
    addSnippet(snippet: CodeSnippet): void {
        // 检查是否已存在
        const exists = this.snippetList.some(s => s.id === snippet.id);
        if (!exists) {
            this.snippetList.push(snippet);
            this.onSnippetListChangedEmitter.fire(this.snippetList);
        }
    }

    /**
     * 移除代码片段
     */
    removeSnippet(snippetId: string): void {
        const index = this.snippetList.findIndex(s => s.id === snippetId);
        if (index !== -1) {
            this.snippetList.splice(index, 1);
            this.onSnippetListChangedEmitter.fire(this.snippetList);
        }
    }

    /**
     * 获取当前导出列表
     */
    getSnippetList(): CodeSnippet[] {
        return [...this.snippetList];
    }

    /**
     * 导出选中的代码片段
     */
    async exportSnippets(targetPath: string, options: SnippetExportOptions): Promise<void> {
        if (this.snippetList.length === 0) {
            throw new Error('导出列表为空');
        }

        await fs.promises.mkdir(targetPath, { recursive: true });

        if (options.outputFormat === 'single-file') {
            // 合并为单个文件
            await this.exportAsSingleFile(targetPath);
        } else {
            // 保持目录结构或平铺
            await this.exportAsFiles(targetPath, options.preserveStructure);
        }

        vscode.window.showInformationMessage(`代码片段已导出到: ${targetPath}`);
    }

    /**
     * 清空导出列表
     */
    clearSnippetList(): void {
        this.snippetList = [];
        this.onSnippetListChangedEmitter.fire(this.snippetList);
    }

    // ============================================
    // 私有方法
    // ============================================

    /**
     * 递归复制目录
     */
    private async copyDirectory(
        source: string,
        target: string,
        filter: (filePath: string) => boolean
    ): Promise<void> {
        const entries = await fs.promises.readdir(source, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const targetPath = path.join(target, entry.name);

            if (!filter(sourcePath)) {
                continue;
            }

            if (entry.isDirectory()) {
                await fs.promises.mkdir(targetPath, { recursive: true });
                await this.copyDirectory(sourcePath, targetPath, filter);
            } else {
                await fs.promises.copyFile(sourcePath, targetPath);
            }
        }
    }

    /**
     * 导出为单个文件
     */
    private async exportAsSingleFile(targetPath: string): Promise<void> {
        const lines: string[] = [];
        lines.push('# 导出的代码片段\n');

        for (const snippet of this.snippetList) {
            lines.push(`## ${snippet.filePath}`);
            if (snippet.startLine && snippet.endLine) {
                lines.push(`行 ${snippet.startLine}-${snippet.endLine}`);
            }
            lines.push('');
            lines.push('```');
            lines.push(snippet.content);
            lines.push('```');
            lines.push('');
        }

        const outputPath = path.join(targetPath, 'snippets.md');
        await fs.promises.writeFile(outputPath, lines.join('\n'), 'utf-8');
    }

    /**
     * 导出为多个文件
     */
    private async exportAsFiles(targetPath: string, preserveStructure: boolean): Promise<void> {
        for (const snippet of this.snippetList) {
            let outputPath: string;

            if (preserveStructure) {
                // 保持原目录结构
                outputPath = path.join(targetPath, snippet.filePath);
                await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
            } else {
                // 平铺到目标目录
                const fileName = path.basename(snippet.filePath);
                const ext = path.extname(fileName);
                const baseName = path.basename(fileName, ext);
                outputPath = path.join(targetPath, `${baseName}_${snippet.id.slice(0, 8)}${ext}`);
            }

            await fs.promises.writeFile(outputPath, snippet.content, 'utf-8');
        }
    }

    /**
     * 获取当前教程（需要从 TutorialManager 获取）
     */
    private getCurrentTutorial() {
        // 这里需要注入 TutorialManager 或通过其他方式获取
        // 暂时返回 undefined，实际使用时需要正确注入
        return undefined as { rootPath: string } | undefined;
    }

    /**
     * 设置教程管理器引用
     */
    setTutorialGetter(getter: () => { rootPath: string } | undefined): void {
        this.getCurrentTutorial = getter;
    }

    /**
     * 释放资源
     */
    dispose(): void {
        this.onSnippetListChangedEmitter.dispose();
    }
}

// 导出单例
let instance: ExportModule | null = null;

export function getExportModule(): ExportModule {
    if (!instance) {
        instance = new ExportModule();
    }
    return instance;
}
