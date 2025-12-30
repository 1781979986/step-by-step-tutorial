import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IExplanationPanel } from '../interfaces';
import { CodeReference } from '../types';

/**
 * 讲解面板 - 使用 Webview 显示 Markdown 内容
 */
export class ExplanationPanel implements IExplanationPanel {
    private panel: vscode.WebviewPanel | undefined;
    private extensionUri: vscode.Uri;
    private codeReferenceCallback: ((filePath: string, line: number) => void) | undefined;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
    }

    /**
     * 显示讲解内容
     * @param content Markdown 内容
     * @param stepTitle 步骤标题
     */
    show(content: string, stepTitle: string): void {
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel(
                'tutorialExplanation',
                '教程讲解',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [this.extensionUri]
                }
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });

            // 处理 Webview 消息
            this.panel.webview.onDidReceiveMessage(message => {
                if (message.type === 'codeReference' && this.codeReferenceCallback) {
                    this.codeReferenceCallback(message.filePath, message.line);
                }
            });
        }

        this.panel.title = `讲解: ${stepTitle}`;
        this.panel.webview.html = this.getWebviewContent(content, stepTitle);
        this.panel.reveal(vscode.ViewColumn.Beside);
    }

    /**
     * 隐藏面板
     */
    hide(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }

    /**
     * 处理代码引用点击
     */
    onCodeReferenceClick(callback: (filePath: string, line: number) => void): void {
        this.codeReferenceCallback = callback;
    }

    /**
     * 从文件加载并显示讲解内容
     * @param filePath 讲解文件路径
     * @param stepTitle 步骤标题
     */
    async showFromFile(filePath: string, stepTitle: string): Promise<void> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            this.show(content, stepTitle);
        } catch (error) {
            this.show(
                `# 讲解内容加载失败\n\n无法加载文件: ${filePath}\n\n错误: ${error}`,
                stepTitle
            );
        }
    }

    /**
     * 生成 Webview HTML 内容
     */
    private getWebviewContent(markdown: string, title: string): string {
        // 解析代码引用
        const processedMarkdown = this.processCodeReferences(markdown);

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        h1, h2, h3, h4, h5, h6 {
            color: var(--vscode-editor-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
            margin-top: 24px;
        }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.25em; }
        code {
            font-family: var(--vscode-editor-font-family);
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
        }
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
        }
        pre code {
            padding: 0;
            background: none;
        }
        a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .code-reference {
            display: inline-block;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            margin: 4px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }
        .code-reference:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        blockquote {
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            margin: 16px 0;
            padding: 8px 16px;
            background-color: var(--vscode-textBlockQuote-background);
        }
        ul, ol {
            padding-left: 24px;
        }
        li {
            margin: 8px 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        th, td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: var(--vscode-editor-lineHighlightBackground);
        }
        img {
            max-width: 100%;
            height: auto;
        }
        hr {
            border: none;
            border-top: 1px solid var(--vscode-panel-border);
            margin: 24px 0;
        }
    </style>
</head>
<body>
    <div id="content">${this.renderMarkdown(processedMarkdown)}</div>
    <script>
        const vscode = acquireVsCodeApi();
        
        document.querySelectorAll('.code-reference').forEach(el => {
            el.addEventListener('click', () => {
                const filePath = el.dataset.file;
                const line = parseInt(el.dataset.line, 10);
                vscode.postMessage({
                    type: 'codeReference',
                    filePath: filePath,
                    line: line
                });
            });
        });
    </script>
</body>
</html>`;
    }

    /**
     * 处理代码引用标记
     * 格式: <!-- code-ref: path:startLine-endLine -->
     */
    private processCodeReferences(markdown: string): string {
        const codeRefPattern = /<!--\s*code-ref:\s*([^:]+):(\d+)(?:-(\d+))?\s*-->/g;

        return markdown.replace(codeRefPattern, (match, filePath, startLine, endLine) => {
            const lineRange = endLine ? `${startLine}-${endLine}` : startLine;
            return `<span class="code-reference" data-file="${this.escapeHtml(filePath)}" data-line="${startLine}">📄 ${this.escapeHtml(filePath)}:${lineRange}</span>`;
        });
    }

    /**
     * 解析代码引用
     */
    parseCodeReference(text: string): CodeReference | null {
        const match = text.match(/<!--\s*code-ref:\s*([^:]+):(\d+)(?:-(\d+))?\s*-->/);
        if (!match) {
            return null;
        }

        return {
            filePath: match[1].trim(),
            startLine: parseInt(match[2], 10),
            endLine: match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10)
        };
    }

    /**
     * 简单的 Markdown 渲染
     * 注意：生产环境应使用 marked 或类似库
     */
    private renderMarkdown(markdown: string): string {
        let html = this.escapeHtml(markdown);

        // 代码块
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
        });

        // 行内代码
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 标题
        html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
        html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

        // 粗体和斜体
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // 链接
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // 无序列表
        html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // 有序列表
        html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');

        // 引用
        html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

        // 水平线
        html = html.replace(/^---$/gm, '<hr>');

        // 段落
        html = html.replace(/\n\n/g, '</p><p>');
        html = `<p>${html}</p>`;

        // 恢复代码引用标签
        html = html.replace(/&lt;span class="code-reference"/g, '<span class="code-reference"');
        html = html.replace(/&lt;\/span&gt;/g, '</span>');

        return html;
    }

    /**
     * HTML 转义
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * 释放资源
     */
    dispose(): void {
        this.hide();
    }
}
