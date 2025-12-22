/**
 * GetProjectInfoTool - 获取Keil项目信息工具
 */

import * as vscode from 'vscode';
import { KeilChatTool, ProjectInfo, TargetInfo } from '../types';

/**
 * 获取项目信息工具
 * 返回项目名称、类型、目标列表、源文件列表等信息
 * 
 * 注意: name, description, inputSchema等元数据在package.json的languageModelTools贡献点中定义
 */
export class GetProjectInfoTool extends KeilChatTool {
    readonly tags = ['info', 'project', 'keil', 'structure', 'configuration'];

    constructor(private projectExplorer: any) {
        super();
    }

    /**
     * 准备工具调用 - 提供有用的进度消息
     */
    prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<any>,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: 'Retrieving Keil project information'
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<any>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            // 获取当前活动项目
            const activeProject = this.projectExplorer.currentActiveProject;
            if (!activeProject) {
                return this.formatResult({
                    message: 'No active Keil project found. Please open a project first.'
                });
            }

            // 获取项目类型
            const activeTarget = activeProject.getActiveTarget();
            let projectType: 'C51' | 'C251' | 'ARM' = 'ARM';
            if (activeTarget) {
                const targetClassName = activeTarget.constructor.name;
                if (targetClassName === 'C51Target') {
                    projectType = 'C51';
                } else if (targetClassName === 'C251Target') {
                    projectType = 'C251';
                } else if (targetClassName === 'ArmTarget') {
                    projectType = 'ARM';
                }
            }

            // 获取所有目标
            const targets: TargetInfo[] = activeProject.getTargets().map((target: any) => ({
                name: target.targetName,
                description: target.tooltip
            }));

            // 获取源文件列表
            const sourceFiles: string[] = [];
            const activeTargetObj = activeProject.getActiveTarget();
            if (activeTargetObj) {
                const fileGroups = activeTargetObj.fGroups || [];
                fileGroups.forEach((group: any) => {
                    if (group.sources && Array.isArray(group.sources)) {
                        group.sources.forEach((source: any) => {
                            if (source.file && source.file.path) {
                                sourceFiles.push(source.file.path);
                            }
                        });
                    }
                });
            }

            // 构建项目信息
            const projectInfo: ProjectInfo = {
                projectName: activeProject.label,
                projectPath: activeProject.uvprjFile.path,
                projectType,
                activeTarget: activeTarget ? activeTarget.targetName : '',
                targets,
                sourceFiles
            };

            return this.formatResult(projectInfo);

        } catch (error: any) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const outputChannel = vscode.window.createOutputChannel('Keil Assistant Chat Tools');
            outputChannel.appendLine(`[GetProjectInfoTool] Error: ${errorMsg}`);
            outputChannel.show(true);
            outputChannel.dispose();
            
            return this.formatError(error, 'Failed to get project info');
        }
    }
}
