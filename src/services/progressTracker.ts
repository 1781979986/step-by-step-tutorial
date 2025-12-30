import * as vscode from 'vscode';
import { IProgressTracker } from '../interfaces';
import { TutorialProgress, StepStatus, StepNode } from '../types';

const STORAGE_KEY = 'interactiveTutorial.progress';

/**
 * 进度追踪器 - 管理学习进度
 */
export class ProgressTracker implements IProgressTracker {
    private context: vscode.ExtensionContext | null = null;
    private progressCache: Map<string, TutorialProgress> = new Map();

    /**
     * 初始化进度追踪器
     * @param context VS Code 扩展上下文
     */
    initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        this.loadFromStorage();
    }

    /**
     * 获取教程进度
     * @param tutorialId 教程 ID
     */
    getProgress(tutorialId: string): TutorialProgress {
        const cached = this.progressCache.get(tutorialId);
        if (cached) {
            return cached;
        }

        // 创建新的进度记录
        const newProgress: TutorialProgress = {
            tutorialId,
            currentStepId: null,
            completedSteps: [],
            lastAccessTime: Date.now()
        };

        this.progressCache.set(tutorialId, newProgress);
        return newProgress;
    }

    /**
     * 标记步骤完成
     * @param tutorialId 教程 ID
     * @param stepId 步骤 ID
     */
    markStepCompleted(tutorialId: string, stepId: string): void {
        const progress = this.getProgress(tutorialId);
        
        if (!progress.completedSteps.includes(stepId)) {
            progress.completedSteps.push(stepId);
            progress.lastAccessTime = Date.now();
            this.saveToStorage();
        }
    }

    /**
     * 设置当前步骤
     * @param tutorialId 教程 ID
     * @param stepId 步骤 ID
     */
    setCurrentStep(tutorialId: string, stepId: string): void {
        const progress = this.getProgress(tutorialId);
        
        // 如果之前有当前步骤，标记为完成
        if (progress.currentStepId && progress.currentStepId !== stepId) {
            this.markStepCompleted(tutorialId, progress.currentStepId);
        }

        progress.currentStepId = stepId;
        progress.lastAccessTime = Date.now();
        this.saveToStorage();
    }

    /**
     * 重置进度
     * @param tutorialId 教程 ID
     */
    resetProgress(tutorialId: string): void {
        const newProgress: TutorialProgress = {
            tutorialId,
            currentStepId: null,
            completedSteps: [],
            lastAccessTime: Date.now()
        };

        this.progressCache.set(tutorialId, newProgress);
        this.saveToStorage();
    }

    /**
     * 计算步骤状态
     * @param tutorialId 教程 ID
     * @param stepId 步骤 ID
     */
    getStepStatus(tutorialId: string, stepId: string): StepStatus {
        const progress = this.getProgress(tutorialId);

        if (progress.currentStepId === stepId) {
            return 'current';
        }

        if (progress.completedSteps.includes(stepId)) {
            return 'completed';
        }

        return 'pending';
    }

    /**
     * 批量获取步骤状态
     * @param tutorialId 教程 ID
     * @param steps 步骤列表
     */
    getStepsStatus(tutorialId: string, steps: StepNode[]): Map<string, StepStatus> {
        const statusMap = new Map<string, StepStatus>();
        
        for (const step of steps) {
            statusMap.set(step.id, this.getStepStatus(tutorialId, step.id));
        }

        return statusMap;
    }

    /**
     * 获取所有教程的进度
     */
    getAllProgress(): TutorialProgress[] {
        return Array.from(this.progressCache.values());
    }

    /**
     * 删除教程进度
     * @param tutorialId 教程 ID
     */
    deleteProgress(tutorialId: string): void {
        this.progressCache.delete(tutorialId);
        this.saveToStorage();
    }

    // ============================================
    // 持久化方法
    // ============================================

    /**
     * 从存储加载进度数据
     */
    private loadFromStorage(): void {
        if (!this.context) {
            return;
        }

        const stored = this.context.globalState.get<Record<string, TutorialProgress>>(STORAGE_KEY);
        
        if (stored) {
            this.progressCache = new Map(Object.entries(stored));
        }
    }

    /**
     * 保存进度数据到存储
     */
    private saveToStorage(): void {
        if (!this.context) {
            return;
        }

        const data: Record<string, TutorialProgress> = {};
        this.progressCache.forEach((value, key) => {
            data[key] = value;
        });

        this.context.globalState.update(STORAGE_KEY, data);
    }

    /**
     * 序列化进度数据（用于测试）
     */
    serialize(): string {
        const data: Record<string, TutorialProgress> = {};
        this.progressCache.forEach((value, key) => {
            data[key] = value;
        });
        return JSON.stringify(data);
    }

    /**
     * 反序列化进度数据（用于测试）
     */
    deserialize(json: string): void {
        const data = JSON.parse(json) as Record<string, TutorialProgress>;
        this.progressCache = new Map(Object.entries(data));
    }
}

// 导出单例
let instance: ProgressTracker | null = null;

export function getProgressTracker(): ProgressTracker {
    if (!instance) {
        instance = new ProgressTracker();
    }
    return instance;
}
