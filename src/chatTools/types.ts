/**
 * Chat Tools类型定义
 */

import * as vscode from 'vscode';

/**
 * 诊断信息结构
 */
export interface DiagnosticInfo {
    file: string;
    line: number;
    severity: 'error' | 'warning';
    code: string;
    message: string;
}

/**
 * 编译结果
 */
export interface BuildResult {
    success: boolean;
    exitCode: number;
    target: string;
    buildLog: string;
    message?: string;
}

/**
 * 项目目标信息
 */
export interface TargetInfo {
    name: string;
    description?: string;
}

/**
 * 项目信息
 */
export interface ProjectInfo {
    projectName: string;
    projectPath: string;
    projectType: 'C51' | 'C251' | 'ARM';
    activeTarget: string;
    targets: TargetInfo[];
    sourceFiles: string[];
}

/**
 * Keil Chat Tool抽象基类
 */
export abstract class KeilChatTool implements vscode.LanguageModelTool<any> {
    /**
     * 工具标签,用于LLM发现和筛选工具
     * 子类必须定义此属性
     */
    abstract readonly tags: readonly string[];

    abstract invoke(
        options: vscode.LanguageModelToolInvocationOptions<any>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult>;

    /**
     * 在工具调用前准备调用信息
     * 提供进度消息和确认请求
     */
    prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<any>,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
        // 子类可以重写此方法来提供自定义的准备逻辑
        return undefined;
    }

    /**
     * 格式化工具结果为LanguageModelToolResult
     */
    protected formatResult(data: any): vscode.LanguageModelToolResult {
        const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(content)
        ]);
    }

    /**
     * 格式化错误信息
     */
    protected formatError(error: Error | string, context?: string): vscode.LanguageModelToolResult {
        const errorMessage = error instanceof Error ? error.message : error;
        const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
        
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify({
                success: false,
                error: fullMessage
            }, null, 2))
        ]);
    }
}
