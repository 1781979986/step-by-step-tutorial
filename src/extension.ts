import * as vscode from 'vscode';
import * as path from 'path';
import { getTutorialManager } from './services/tutorialManager';
import { getProgressTracker } from './services/progressTracker';
import { getExportModule } from './services/exportModule';
import { StepTreeProvider } from './ui/stepTreeProvider';
import { DiffViewerManager } from './ui/diffViewer';
import { ExplanationPanel } from './ui/explanationPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Interactive Tutorial System is now active!');

    // 初始化服务
    const tutorialManager = getTutorialManager();
    const progressTracker = getProgressTracker();
    const exportModule = getExportModule();
    
    progressTracker.initialize(context);
    exportModule.setTutorialGetter(() => tutorialManager.getCurrentTutorial());

    // 创建 UI 组件
    const stepTreeProvider = new StepTreeProvider(progressTracker);
    const diffViewerManager = new DiffViewerManager(tutorialManager.getGitService());
    const explanationPanel = new ExplanationPanel(context.extensionUri);

    // 创建步骤树视图
    const treeView = vscode.window.createTreeView('tutorialStepTree', {
        treeDataProvider: stepTreeProvider,
        showCollapseAll: true
    });

    // 监听教程加载事件
    tutorialManager.onTutorialLoaded(tutorial => {
        stepTreeProvider.setTutorial(tutorial);
        vscode.commands.executeCommand('setContext', 'interactiveTutorial.tutorialLoaded', true);
        
        // 自动聚焦到步骤树视图
        treeView.reveal(undefined as unknown as never, { focus: true, expand: true }).then(
            () => {},
            () => {} // 忽略错误
        );
        
        // 显示侧边栏
        vscode.commands.executeCommand('tutorialStepTree.focus');
    });

    // 监听步骤切换事件
    tutorialManager.onStepChanged(async step => {
        const tutorial = tutorialManager.getCurrentTutorial();
        if (!tutorial) {return;}

        // 更新进度
        progressTracker.setCurrentStep(tutorial.id, step.id);
        stepTreeProvider.refresh();

        // 显示 diff
        const stepIndex = tutorial.steps.findIndex(s => s.id === step.id);
        const previousStep = stepIndex > 0 ? tutorial.steps[stepIndex - 1] : null;
        await diffViewerManager.showStepDiff(step, previousStep, tutorial.rootPath);

        // 显示讲解内容
        const explanationPath = path.join(tutorial.rootPath, step.explanationPath);
        await explanationPanel.showFromFile(explanationPath, step.title);
    });

    // 处理代码引用点击
    explanationPanel.onCodeReferenceClick(async (filePath, line) => {
        const tutorial = tutorialManager.getCurrentTutorial();
        if (!tutorial) {return;}

        const fullPath = path.join(tutorial.rootPath, filePath);
        const uri = vscode.Uri.file(fullPath);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        
        const position = new vscode.Position(line - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    });

    // ============================================
    // 注册命令
    // ============================================

    // 打开教程
    const openTutorialCmd = vscode.commands.registerCommand(
        'interactiveTutorial.openTutorial',
        async () => {
            const choice = await vscode.window.showQuickPick(
                ['从本地文件夹打开', '从 Git URL 克隆'],
                { placeHolder: '选择教程来源' }
            );

            if (!choice) {return;}

            let source: string | undefined;

            if (choice === '从本地文件夹打开') {
                const folders = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    title: '选择教程文件夹'
                });

                if (folders && folders.length > 0) {
                    source = folders[0].fsPath;
                }
            } else {
                source = await vscode.window.showInputBox({
                    prompt: '输入 Git 仓库 URL',
                    placeHolder: 'https://github.com/user/tutorial-repo.git'
                });
            }

            if (!source) {return;}

            try {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: '正在加载教程...',
                        cancellable: false
                    },
                    async () => {
                        await tutorialManager.loadTutorial(source!);
                    }
                );

                vscode.window.showInformationMessage('教程加载成功！');
            } catch (error) {
                vscode.window.showErrorMessage(
                    `加载教程失败: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    );

    // 切换到步骤
    const navigateToStepCmd = vscode.commands.registerCommand(
        'interactiveTutorial.navigateToStep',
        async (stepId: string) => {
            try {
                await tutorialManager.navigateToStep(stepId);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `切换步骤失败: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    );

    // 导出当前进度
    const exportProjectCmd = vscode.commands.registerCommand(
        'interactiveTutorial.exportProject',
        async () => {
            const tutorial = tutorialManager.getCurrentTutorial();
            if (!tutorial) {
                vscode.window.showWarningMessage('请先加载一个教程');
                return;
            }

            const targetFolder = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: '选择导出目标文件夹'
            });

            if (!targetFolder || targetFolder.length === 0) {return;}

            const targetPath = path.join(targetFolder[0].fsPath, `${tutorial.name}-export`);

            try {
                await exportModule.exportProject(targetPath, {
                    removeGitHistory: true,
                    removeTutorialConfig: true,
                    openInNewWindow: true
                });
            } catch (error) {
                vscode.window.showErrorMessage(
                    `导出失败: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    );

    // 导出代码片段
    const exportSnippetsCmd = vscode.commands.registerCommand(
        'interactiveTutorial.exportSnippets',
        async () => {
            const snippets = exportModule.getSnippetList();
            if (snippets.length === 0) {
                vscode.window.showWarningMessage('导出列表为空，请先添加代码片段');
                return;
            }

            const format = await vscode.window.showQuickPick(
                [
                    { label: '保持目录结构', value: 'files-structure' },
                    { label: '平铺文件', value: 'files-flat' },
                    { label: '合并为单个 Markdown 文件', value: 'single-file' }
                ],
                { placeHolder: '选择导出格式' }
            );

            if (!format) {return;}

            const targetFolder = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: '选择导出目标文件夹'
            });

            if (!targetFolder || targetFolder.length === 0) {return;}

            try {
                await exportModule.exportSnippets(targetFolder[0].fsPath, {
                    preserveStructure: format.value === 'files-structure',
                    outputFormat: format.value === 'single-file' ? 'single-file' : 'files'
                });
            } catch (error) {
                vscode.window.showErrorMessage(
                    `导出失败: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    );

    // 添加代码片段到导出列表
    const addSnippetCmd = vscode.commands.registerCommand(
        'interactiveTutorial.addSnippet',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('请先打开一个文件');
                return;
            }

            const tutorial = tutorialManager.getCurrentTutorial();
            const currentStep = tutorialManager.getCurrentStep();
            
            if (!tutorial || !currentStep) {
                vscode.window.showWarningMessage('请先加载教程并选择步骤');
                return;
            }

            const selection = editor.selection;
            const content = editor.document.getText(selection.isEmpty ? undefined : selection);
            const relativePath = path.relative(tutorial.rootPath, editor.document.uri.fsPath);

            exportModule.addSnippet({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                filePath: relativePath,
                startLine: selection.isEmpty ? undefined : selection.start.line + 1,
                endLine: selection.isEmpty ? undefined : selection.end.line + 1,
                content,
                stepId: currentStep.id
            });

            vscode.window.showInformationMessage('代码片段已添加到导出列表');
        }
    );

    // 清空导出列表
    const clearSnippetsCmd = vscode.commands.registerCommand(
        'interactiveTutorial.clearSnippets',
        () => {
            exportModule.clearSnippetList();
            vscode.window.showInformationMessage('导出列表已清空');
        }
    );

    // 关闭教程
    const closeTutorialCmd = vscode.commands.registerCommand(
        'interactiveTutorial.closeTutorial',
        async () => {
            await tutorialManager.closeTutorial();
            stepTreeProvider.setTutorial(undefined);
            diffViewerManager.clear();
            explanationPanel.hide();
            vscode.commands.executeCommand('setContext', 'interactiveTutorial.tutorialLoaded', false);
            vscode.window.showInformationMessage('教程已关闭');
        }
    );

    // 注册到上下文
    context.subscriptions.push(
        treeView,
        stepTreeProvider,
        diffViewerManager,
        explanationPanel,
        openTutorialCmd,
        navigateToStepCmd,
        exportProjectCmd,
        exportSnippetsCmd,
        addSnippetCmd,
        clearSnippetsCmd,
        closeTutorialCmd
    );
}

export function deactivate() {
    // Cleanup resources
}
