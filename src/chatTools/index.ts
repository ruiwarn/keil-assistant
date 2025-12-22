/**
 * Chat Tools注册入口
 */

import * as vscode from 'vscode';
import { BuildTool } from './tools/BuildTool';
import { GetProjectInfoTool } from './tools/GetProjectInfoTool';

/**
 * 注册所有Chat Tools
 * @param context 扩展上下文
 * @param projectExplorer ProjectExplorer实例,用于访问项目和目标
 */
export function registerChatTools(context: vscode.ExtensionContext, projectExplorer: any): void {
    try {
        // 检查Language Model API是否可用
        if (!vscode.lm || !vscode.lm.registerTool) {
            console.warn('[Keil Assistant] Language Model API not available. Chat Tools will not be registered.');
            vscode.window.showWarningMessage('Keil Assistant: Chat Tools require GitHub Copilot to be installed and enabled.');
            return;
        }

        const outputChannel = vscode.window.createOutputChannel('Keil Assistant Chat Tools');
        // 不自动显示输出频道,避免打断用户工作流
        outputChannel.appendLine('=================================================');
        outputChannel.appendLine('[Chat Tools] Starting registration...');
        outputChannel.appendLine('=================================================');
        
        // 注册BuildTool
        try {
            const buildTool = new BuildTool(projectExplorer);
            const buildToolDisposable = vscode.lm.registerTool('build_keil_project', buildTool);
            context.subscriptions.push(buildToolDisposable);
            outputChannel.appendLine('[Chat Tools] BuildTool registered: build_keil_project');
        } catch (error) {
            const errorMsg = `Failed to register BuildTool: ${error}`;
            outputChannel.appendLine(`[Chat Tools] ${errorMsg}`);
            console.error('[Keil Assistant]', errorMsg);
        }

        // 注册GetProjectInfoTool
        try {
            const getProjectInfoTool = new GetProjectInfoTool(projectExplorer);
            const infoToolDisposable = vscode.lm.registerTool('get_keil_project_info', getProjectInfoTool);
            context.subscriptions.push(infoToolDisposable);
            outputChannel.appendLine('[Chat Tools] GetProjectInfoTool registered: get_keil_project_info');
        } catch (error) {
            const errorMsg = `Failed to register GetProjectInfoTool: ${error}`;
            outputChannel.appendLine(`[Chat Tools] ${errorMsg}`);
            console.error('[Keil Assistant]', errorMsg);
        }

        outputChannel.appendLine('[Chat Tools] All tools registered successfully');
        
        // 验证工具是否在lm.tools中
        setTimeout(() => {
            outputChannel.appendLine('\n=================================================');
            outputChannel.appendLine('[Chat Tools] Verifying tool registration...');
            outputChannel.appendLine(`[Chat Tools] Total tools in lm.tools: ${vscode.lm.tools.length}`);
            
            const ourTools = vscode.lm.tools.filter(t => t.name === 'build_keil_project' || t.name === 'get_keil_project_info');
            outputChannel.appendLine(`[Chat Tools] Our tools found: ${ourTools.length}`);
            
            ourTools.forEach(tool => {
                outputChannel.appendLine(`  - ${tool.name}`);
                outputChannel.appendLine(`    Description: ${tool.description}`);
                outputChannel.appendLine(`    Tags: ${tool.tags.join(', ')}`);
            });
            
            if (ourTools.length === 0) {
                outputChannel.appendLine('[Chat Tools] WARNING: No Keil Assistant tools found in lm.tools!');
            } else {
                outputChannel.appendLine('[Chat Tools] ✓ Tools successfully registered and available to LLM');
            }
            
            outputChannel.appendLine('=================================================');
            outputChannel.appendLine('[Chat Tools] Tips for using tools:');
            outputChannel.appendLine('  - Tools are available in Copilot Chat');
            outputChannel.appendLine('  - Try asking: "Build the Keil project"');
            outputChannel.appendLine('  - Try asking: "Show me information about this project"');
            outputChannel.appendLine('  - Try asking: "Compile and check for errors"');
            outputChannel.appendLine('  - Or use tool references: #build_keil_project or #get_keil_project_info');
            outputChannel.appendLine('=================================================');
        }, 100);
        
        // 保持outputChannel打开以便调试
        context.subscriptions.push(outputChannel);
        
    } catch (error) {
        const errorMsg = `Failed to register Chat Tools: ${error}`;
        console.error('[Keil Assistant]', errorMsg);
        vscode.window.showErrorMessage(`Keil Assistant: ${errorMsg}`);
    }
}
