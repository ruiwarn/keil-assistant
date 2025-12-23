/**
 * BuildTool - Keil项目编译工具
 */

import * as vscode from 'vscode';
import { KeilChatTool, BuildResult } from '../types';

/**
 * 编译工具输入参数
 */
interface BuildToolInput {
    target?: string;
    rebuild?: boolean;
}

/**
 * Keil项目编译工具
 * 支持编译指定目标,可选重新编译,异步等待编译完成并返回结果
 * 
 * 注意: name, description, inputSchema等元数据在package.json的languageModelTools贡献点中定义
 */
export class BuildTool extends KeilChatTool {
    readonly tags = ['build', 'compile', 'keil', 'embedded', 'firmware'];

    constructor(private projectExplorer: any) {
        super();
    }

    /**
     * 准备工具调用 - 提供有用的进度消息
     */
    prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<BuildToolInput>,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
        const { target, rebuild } = options.input;
        const action = rebuild ? 'Rebuilding' : 'Building';
        const targetName = target || 'active target';
        
        return {
            invocationMessage: `${action} Keil project target: ${targetName}`
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<BuildToolInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const outputChannel = vscode.window.createOutputChannel('Keil Assistant Chat Tools');
        
        try {
            const { target, rebuild = false } = options.input;
            outputChannel.appendLine(`[BuildTool] Starting ${rebuild ? 'rebuild' : 'build'} for target: ${target || 'active'}`);

            // 获取当前活动项目
            const activeProject = this.projectExplorer.currentActiveProject;
            if (!activeProject) {
                const errorMsg = 'No active Keil project found. Please open a project first.';
                outputChannel.appendLine(`[BuildTool] Error: ${errorMsg}`);
                return this.formatResult({
                    success: false,
                    exitCode: -1,
                    target: target || 'unknown',
                    buildLog: '',
                    message: errorMsg
                });
            }

            // 获取目标
            let targetObj: any;
            if (target) {
                targetObj = activeProject.getTargetByName(target);
                if (!targetObj) {
                    const availableTargets = activeProject.getTargets().map((t: any) => t.targetName).join(', ');
                    return this.formatResult({
                        success: false,
                        exitCode: -1,
                        target: target,
                        buildLog: '',
                        message: `Target '${target}' not found. Available targets: ${availableTargets}`
                    });
                }
            } else {
                targetObj = activeProject.getActiveTarget();
                if (!targetObj) {
                    return this.formatResult({
                        success: false,
                        exitCode: -1,
                        target: 'unknown',
                        buildLog: '',
                        message: 'No active target found in the project.'
                    });
                }
            }

            // 创建Promise等待编译完成
            const buildPromise = new Promise<{ exitCode: number, target: any }>((resolve, reject) => {
                let isResolved = false;
                
                const timeoutId = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        disposable.dispose();
                        outputChannel.appendLine('[BuildTool] Build timeout after 5 minutes');
                        reject(new Error('Build timeout after 5 minutes'));
                    }
                }, 300000); // 5分钟超时

                const disposable = vscode.tasks.onDidEndTaskProcess((event: any) => {
                    const task = event.execution.task;
                    // 检查是否是我们的编译任务
                    if (task.definition.type === 'keil-task' &&
                        (task.name === 'build' || task.name === 'rebuild') &&
                        task.definition.prjID === activeProject.prjID &&
                        task.definition.targetName === targetObj.targetName) {
                        
                        if (!isResolved) {
                            isResolved = true;
                            clearTimeout(timeoutId);
                            disposable.dispose();
                            
                            // 检查 exitCode 是否有效
                            if (event.exitCode === undefined || event.exitCode === null) {
                                outputChannel.appendLine('[BuildTool] Build ended with undefined exit code - task may have been cancelled or failed abnormally');
                                reject(new Error('Build ended with undefined exit code'));
                            } else {
                                outputChannel.appendLine(`[BuildTool] Build completed with exit code: ${event.exitCode}`);
                                resolve({ exitCode: event.exitCode, target: targetObj });
                            }
                        }
                    }
                });

                // 处理取消
                const cancellationListener = token.onCancellationRequested(() => {
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeoutId);
                        disposable.dispose();
                        cancellationListener.dispose();
                        outputChannel.appendLine('[BuildTool] Build cancelled by user');
                        reject(new Error('Build cancelled by user'));
                    }
                });
            });

            // 启动编译
            if (rebuild) {
                targetObj.rebuild();
            } else {
                targetObj.build();
            }

            // 等待编译完成
            const result = await buildPromise;

            // 等待一小段时间确保日志文件写入完成
            await new Promise(resolve => setTimeout(resolve, 500));

            // 读取日志文件内容
            const logFilePath = targetObj.uv4LogFile?.path || '';
            let buildLog = '';
            
            if (logFilePath) {
                try {
                    const fs = require('fs');
                    if (fs.existsSync(logFilePath)) {
                        buildLog = fs.readFileSync(logFilePath, 'utf-8');
                        outputChannel.appendLine(`[BuildTool] Read log file: ${logFilePath}, size: ${buildLog.length} bytes`);
                    } else {
                        outputChannel.appendLine(`[BuildTool] Log file not found: ${logFilePath}`);
                        buildLog = 'Log file not found.';
                    }
                } catch (readError: any) {
                    outputChannel.appendLine(`[BuildTool] Error reading log file: ${readError.message}`);
                    buildLog = `Error reading log file: ${readError.message}`;
                }
            } else {
                buildLog = 'Log file path not available.';
            }

            // 构建结果：直接返回日志内容
            const buildResult: BuildResult = {
                success: result.exitCode === 0,
                exitCode: result.exitCode,
                target: targetObj.targetName,
                buildLog
            };

            return this.formatResult(buildResult);

        } catch (error: any) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            outputChannel.appendLine(`[BuildTool] Error: ${errorMsg}`);
            outputChannel.show(true);
            
            return this.formatResult({
                success: false,
                exitCode: -1,
                target: options.input.target || 'unknown',
                buildLog: '',
                message: `Build failed: ${errorMsg}`
            });
        } finally {
            outputChannel.dispose();
        }
    }
}
