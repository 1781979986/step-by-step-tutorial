import simpleGit, { SimpleGit, DiffResult } from 'simple-git';
import { IGitService } from '../interfaces';
import { FileDiff, DiffHunk } from '../types';

/**
 * Git 操作服务 - 封装 simple-git 库
 */
export class GitService implements IGitService {
    private git: SimpleGit | null = null;
    private repoPath: string | null = null;

    /**
     * 初始化 Git 服务
     * @param repoPath 仓库路径
     */
    initialize(repoPath: string): void {
        this.repoPath = repoPath;
        this.git = simpleGit(repoPath);
    }

    /**
     * 获取当前 Git 实例
     */
    private getGit(): SimpleGit {
        if (!this.git) {
            throw new Error('Git service not initialized. Call initialize() first.');
        }
        return this.git;
    }

    /**
     * 克隆仓库
     * @param url 远程仓库 URL
     * @param targetPath 目标路径
     */
    async clone(url: string, targetPath: string): Promise<void> {
        const git = simpleGit();
        await git.clone(url, targetPath);
        this.initialize(targetPath);
    }

    /**
     * 检出到指定引用
     * @param ref commit hash 或 tag
     */
    async checkout(ref: string): Promise<void> {
        const git = this.getGit();
        await git.checkout(ref);
    }

    /**
     * 获取两个引用之间的 diff
     * @param fromRef 起始引用（可为空表示初始状态）
     * @param toRef 目标引用
     */
    async getDiff(fromRef: string, toRef: string): Promise<FileDiff[]> {
        const git = this.getGit();
        
        let diffSummary: DiffResult;
        let diffOutput: string;

        if (!fromRef) {
            // 第一个步骤：与空树对比
            const emptyTree = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'; // Git 空树 hash
            diffSummary = await git.diffSummary([emptyTree, toRef]);
            diffOutput = await git.diff([emptyTree, toRef]);
        } else {
            diffSummary = await git.diffSummary([fromRef, toRef]);
            diffOutput = await git.diff([fromRef, toRef]);
        }

        const fileDiffs: FileDiff[] = [];
        const hunksMap = this.parseDiffOutput(diffOutput);

        for (const file of diffSummary.files) {
            const filePath = file.file;
            let status: FileDiff['status'] = 'modified';

            if ('insertions' in file && 'deletions' in file) {
                if (file.insertions > 0 && file.deletions === 0 && !fromRef) {
                    status = 'added';
                } else if (file.deletions > 0 && file.insertions === 0) {
                    status = 'deleted';
                }
            }

            // 检查是否为重命名
            if (filePath.includes(' => ')) {
                status = 'renamed';
            }

            // 检查是否为新增文件
            if (hunksMap.has(filePath)) {
                const hunks = hunksMap.get(filePath) || [];
                if (hunks.length > 0 && hunks[0].oldLines === 0) {
                    status = 'added';
                }
            }

            fileDiffs.push({
                filePath,
                status,
                additions: 'insertions' in file ? file.insertions : 0,
                deletions: 'deletions' in file ? file.deletions : 0,
                hunks: hunksMap.get(filePath) || []
            });
        }

        return fileDiffs;
    }

    /**
     * 解析 diff 输出为 hunks
     */
    private parseDiffOutput(diffOutput: string): Map<string, DiffHunk[]> {
        const hunksMap = new Map<string, DiffHunk[]>();
        const lines = diffOutput.split('\n');
        
        let currentFile: string | null = null;
        let currentHunk: DiffHunk | null = null;
        let hunkContent: string[] = [];

        for (const line of lines) {
            // 匹配文件头
            const fileMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
            if (fileMatch) {
                // 保存上一个 hunk
                if (currentFile && currentHunk) {
                    currentHunk.content = hunkContent.join('\n');
                    if (!hunksMap.has(currentFile)) {
                        hunksMap.set(currentFile, []);
                    }
                    hunksMap.get(currentFile)!.push(currentHunk);
                }
                
                currentFile = fileMatch[2];
                currentHunk = null;
                hunkContent = [];
                continue;
            }

            // 匹配 hunk 头
            const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
            if (hunkMatch && currentFile) {
                // 保存上一个 hunk
                if (currentHunk) {
                    currentHunk.content = hunkContent.join('\n');
                    if (!hunksMap.has(currentFile)) {
                        hunksMap.set(currentFile, []);
                    }
                    hunksMap.get(currentFile)!.push(currentHunk);
                }

                currentHunk = {
                    oldStart: parseInt(hunkMatch[1], 10),
                    oldLines: hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1,
                    newStart: parseInt(hunkMatch[3], 10),
                    newLines: hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1,
                    content: ''
                };
                hunkContent = [line];
                continue;
            }

            // 收集 hunk 内容
            if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
                hunkContent.push(line);
            }
        }

        // 保存最后一个 hunk
        if (currentFile && currentHunk) {
            currentHunk.content = hunkContent.join('\n');
            if (!hunksMap.has(currentFile)) {
                hunksMap.set(currentFile, []);
            }
            hunksMap.get(currentFile)!.push(currentHunk);
        }

        return hunksMap;
    }

    /**
     * 检查是否有未提交的修改
     */
    async hasUncommittedChanges(): Promise<boolean> {
        const git = this.getGit();
        const status = await git.status();
        return !status.isClean();
    }

    /**
     * 暂存当前修改
     */
    async stash(): Promise<void> {
        const git = this.getGit();
        await git.stash(['push', '-m', 'tutorial-system-auto-stash']);
    }

    /**
     * 恢复暂存的修改
     */
    async stashPop(): Promise<void> {
        const git = this.getGit();
        await git.stash(['pop']);
    }

    /**
     * 获取当前 HEAD 引用
     */
    async getCurrentRef(): Promise<string> {
        const git = this.getGit();
        const result = await git.revparse(['HEAD']);
        return result.trim();
    }

    /**
     * 验证引用是否存在
     * @param ref Git 引用
     */
    async refExists(ref: string): Promise<boolean> {
        const git = this.getGit();
        try {
            await git.revparse([ref]);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取仓库路径
     */
    getRepoPath(): string | null {
        return this.repoPath;
    }
}

// 导出工厂函数
export function createGitService(repoPath?: string): GitService {
    const service = new GitService();
    if (repoPath) {
        service.initialize(repoPath);
    }
    return service;
}
