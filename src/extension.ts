import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import * as event from 'events';
import * as fs from 'fs';
import * as node_path from 'path';
import * as child_process from 'child_process';
import * as os from 'os'; // Import os module
// import * as vscodeVariables from 'vscode-variables'; // Removed unused import

import { File } from '../lib/node_utility/File';
import { ResourceManager } from './ResourceManager';
let diagnosticCollection: vscode.DiagnosticCollection;
import { FileWatcher } from '../lib/node_utility/FileWatcher';
import { Time } from '../lib/node_utility/Time';
import { isArray } from 'util';
import { CmdLineHandler } from './CmdLineHandler';

// 添加一个消息防重复显示机制
const messageDebouncer = new Map<string, number>();

function showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info', timeout = 1000, items?: string[]) {
    // 生成消息的唯一标识
    const messageKey = `${message}-${type}`;
    const now = Date.now();
    
    // 检查是否在防重复时间内
    const lastShowTime = messageDebouncer.get(messageKey);
    if (lastShowTime && (now - lastShowTime) < 2000) { // 2秒内的相同消息不重复显示
        return;
    }
    
    // 更新显示时间
    messageDebouncer.set(messageKey, now);
    
    // 2秒后清除记录
    setTimeout(() => {
        messageDebouncer.delete(messageKey);
    }, 2000);

    const options = { modal: false };
    let promise: Thenable<string | undefined>;
    
    switch(type) {
        case 'info':
            promise = items ? 
                vscode.window.showInformationMessage(message, ...items) :
                vscode.window.showInformationMessage(message, options);
            break;
        case 'warning':
            promise = items ?
                vscode.window.showWarningMessage(message, ...items) :
                vscode.window.showWarningMessage(message, options);
            break;
        case 'error':
            promise = items ?
                vscode.window.showErrorMessage(message, ...items) :
                vscode.window.showErrorMessage(message, options);
            break;
    }

    // 如果没有选项，则设置定时器自动关闭消息
    if (!items) {
        setTimeout(() => {
            promise.then(result => {
                if (result) {
                    // 如果消息还在显示，则关闭它
                    vscode.commands.executeCommand('workbench.action.closeMessages');
                }
            });
        }, timeout);
    }

    return promise;
}

export function activate(context: vscode.ExtensionContext) {

    console.log('---- keil-assistant actived ----');

    // init resource
    ResourceManager.getInstance(context);

    // Create a diagnostic collection for Keil compiler errors/warnings
    diagnosticCollection = vscode.languages.createDiagnosticCollection('keilAssistant');
    context.subscriptions.push(diagnosticCollection);

    const prjExplorer = new ProjectExplorer(context);
    context.subscriptions.push(prjExplorer); // Assuming ProjectExplorer might need disposal or is a provider

    // Listen for task termination to process diagnostics
    context.subscriptions.push(vscode.tasks.onDidEndTaskProcess(async (event) => {
        const task = event.execution.task;
        // Check if it's our Keil task and it's a build or rebuild
        if (task.definition.type === 'keil-task' && 
            (task.name === 'build' || task.name === 'rebuild') &&
            task.definition.prjID && task.definition.targetName) {
            
            const prjID = task.definition.prjID as string;
            const targetName = task.definition.targetName as string;

            const project = prjExplorer.getProjectById(prjID);
            if (project) {
                const target = project.getTargetByName(targetName);
                if (target) {
                    project.logger.log(`[INFO] Task '${task.name}' ended for ${targetName}. Exit code: ${event.exitCode}. Processing diagnostics.`);
                    await target.processDiagnostics();
                } else {
                    console.error(`Keil Assistant: Could not find target '${targetName}' for project ID '${prjID}' after task end.`);
                }
            } else {
                console.error(`Keil Assistant: Could not find project with ID '${prjID}' after task end.`);
            }
        }
    }));

    const subscriber = context.subscriptions;

    // 注册新的命令
    subscriber.push(vscode.commands.registerCommand('keil.build', () => {
        const target = prjExplorer.getTarget();
        if (target) {
            target.build();
        } else {
            showMessage('请先选择一个工程！', 'warning');
        }
    }));

    subscriber.push(vscode.commands.registerCommand('keil.rebuild', () => {
        const target = prjExplorer.getTarget();
        if (target) {
            target.rebuild();
        } else {
            showMessage('请先选择一个工程！', 'warning');
        }
    }));

    subscriber.push(vscode.commands.registerCommand('keil.download', () => {
        const target = prjExplorer.getTarget();
        if (target) {
            target.download();
        } else {
            showMessage('请先选择一个工程！', 'warning');
        }
    }));

    subscriber.push(vscode.commands.registerCommand('explorer.open', async () => {
        try {
            // 使用 VSCode API 在工作区内搜索 .uvproj 和 .uvprojx 文件
            const uvprojFiles = await vscode.workspace.findFiles('**/*.uvproj', '**/node_modules/**');
            const uvprojxFiles = await vscode.workspace.findFiles('**/*.uvprojx', '**/node_modules/**');
            const allFiles = [...uvprojFiles, ...uvprojxFiles];

            if (allFiles.length === 0) {
                showMessage('工作区内没有找到 Keil 工程文件。', 'info');
                return;
            }

            // 检查工程类型并验证对应的路径
            let hasC51Project = false;
            let hasArmProject = false;

            for (const file of allFiles) {
                const content = await vscode.workspace.fs.readFile(file);
                const xmlContent = content.toString();
                
                // 检查是否是 C51 工程
                if (xmlContent.includes('TargetOption') && xmlContent.includes('Target51') && xmlContent.includes('C51')) {
                    hasC51Project = true;
                }
                // 检查是否是 ARM 工程
                if (xmlContent.includes('TargetOption') && (xmlContent.includes('TargetCommonOption') || xmlContent.includes('TargetArmAds'))) {
                    hasArmProject = true;
                }
            }

            // 根据工程类型检查对应的路径
            if (hasC51Project) {
                const c51Path = vscode.workspace.getConfiguration('KeilAssistant.C51').get<string>('Uv4Path');
                if (!c51Path) {
                    showMessage(
                        '请先设置 C51 UV4 路径！\n' +
                        '1. 打开设置 (Ctrl+,)\n' +
                        '2. 搜索 "KeilAssistant.C51.Uv4Path"\n' +
                        '3. 设置 C51 UV4.exe 的绝对路径\n' +
                        '示例路径：C:\\Keil_v5\\UV4\\UV4.exe',
                        'error'
                    );
                    return;
                }
            }

            if (hasArmProject) {
                const mdkPath = vscode.workspace.getConfiguration('KeilAssistant.MDK').get<string>('Uv4Path');
                if (!mdkPath) {
                    showMessage(
                        '请先设置 MDK UV4 路径！\n' +
                        '1. 打开设置 (Ctrl+,)\n' +
                        '2. 搜索 "KeilAssistant.MDK.Uv4Path"\n' +
                        '3. 设置 MDK UV4.exe 的绝对路径\n' +
                        '示例路径：C:\\Keil_v5\\UV4\\UV4.exe',
                        'error'
                    );
                    return;
                }
            }

            if (allFiles.length === 1) {
                // 如果只找到一个工程文件，则自动打开
                const uvPrjPath = allFiles[0].fsPath;
                await prjExplorer.openProject(uvPrjPath);
            } else {
                // 如果找到多个工程文件，则弹出列表让用户选择
                const items = allFiles.map(file => ({
                    label: vscode.workspace.asRelativePath(file),
                    description: file.fsPath,
                    uri: file
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '请选择一个 Keil 工程文件'
                });

                if (selected) {
                    const uvPrjPath = selected.uri.fsPath;
                    await prjExplorer.openProject(uvPrjPath);
                }
            }
        } catch (error) {
            showMessage(`打开工程失败！错误信息: ${(<Error>error).message}`, 'error');
        }
    }));

    subscriber.push(vscode.commands.registerCommand('project.close', (item: IView) => prjExplorer.closeProject(item.prjID)));

    subscriber.push(vscode.commands.registerCommand('project.build', (item: IView) => prjExplorer.getTarget(item)?.build()));

    subscriber.push(vscode.commands.registerCommand('project.rebuild', (item: IView) => prjExplorer.getTarget(item)?.rebuild()));

    subscriber.push(vscode.commands.registerCommand('project.download', (item: IView) => prjExplorer.getTarget(item)?.download()));

    subscriber.push(vscode.commands.registerCommand('item.copyValue', (item: IView) => vscode.env.clipboard.writeText(item.tooltip || '')));

    subscriber.push(vscode.commands.registerCommand('project.switch', (item: IView) => prjExplorer.switchTargetByProject(item)));
    
    subscriber.push(vscode.commands.registerCommand('project.active', (item: IView) => prjExplorer.activeProject(item)));

    prjExplorer.loadWorkspace();
}

export function deactivate() {
    console.log('---- keil-assistant closed ----');
}

//==================== Global Func===========================

function getMD5(data: string): string {
    const md5 = crypto.createHash('md5');
    md5.update(data);
    return md5.digest('hex');
}

function openWorkspace(wsFile: File) {
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(wsFile.ToUri()));
}

//===============================

interface IView {

    label: string;

    prjID: string;

    icons?: { light: string, dark: string };

    tooltip?: string;

    contextVal?: string;

    getChildViews(): IView[] | undefined;
}

//===============================================

class Source implements IView {

    label: string;
    prjID: string;
    icons?: { light: string; dark: string; } | undefined;
    tooltip?: string | undefined;
    contextVal?: string | undefined = 'Source';

    //---
    readonly file: File;
    readonly enable: boolean;

    children: Source[] | undefined;

    constructor(pID: string, f: File, _enable = true) {
        this.prjID = pID;
        this.enable = _enable;
        this.file = f;
        this.label = this.file.name;
        this.tooltip = f.path;

        let iconName = '';
        if (f.IsFile() === false) {
            iconName = 'FileWarning_16x';
        } else if (_enable === false) {
            iconName = 'FileExclude_16x';
        } else {
            iconName = this.getIconBySuffix(f.suffix.toLowerCase());
        }

        this.icons = {
            dark: iconName,
            light: iconName
        };
    }

    private getIconBySuffix(suffix: string): string {
        switch (suffix) {
            case '.c':
                return 'CFile_16x';
            case '.h':
            case '.hpp':
            case '.hxx':
            case '.inc':
                return 'CPPHeaderFile_16x';
            case '.cpp':
            case '.c++':
            case '.cxx':
            case '.cc':
                return 'CPP_16x';
            case '.s':
            case '.a51':
            case '.asm':
                return 'AssemblerSourceFile_16x';
            case '.lib':
            case '.a':
                return 'Library_16x';
            default:
                return 'Text_16x';
        }
    }

    getChildViews(): IView[] | undefined {
        return this.children;
    }
}

class FileGroup implements IView {

    label: string;
    prjID: string;
    tooltip?: string | undefined;
    contextVal?: string | undefined = 'FileGroup';
    icons?: { light: string; dark: string; };

    //----
    sources: Source[];

    constructor(pID: string, gName: string, disabled: boolean) {
        this.label = gName;
        this.prjID = pID;
        this.sources = [];
        this.tooltip = gName;
        const iconName = disabled ? 'FolderExclude_32x' : 'Folder_32x';
        this.icons = { light: iconName, dark: iconName };
    }

    getChildViews(): IView[] | undefined {
        return this.sources;
    }
}

interface KeilProjectInfo {

    prjID: string;

    projectStorageDir: File; // Renamed from vscodeDir

    uvprjFile: File;

    logger: Console;

    toAbsolutePath(rePath: string): string;
}

interface uVisonInfo {
    schemaVersion: string | undefined;
}

class PathUtils {
    static toRelativePath(absolutePath: string): string {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            // 确保路径是绝对路径
            if (!node_path.isAbsolute(absolutePath)) {
                return absolutePath;
            }
            // 清理可能存在的重复盘符
            const cleanPath = absolutePath.replace(/^[a-z]:\\[a-z]:\\/i, (match) => match.substring(0, 3));
            return node_path.relative(workspaceRoot, cleanPath);
        }
        return absolutePath;
    }

    static toAbsolutePath(relativePath: string): string {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            // 如果已经是绝对路径，直接返回
            if (node_path.isAbsolute(relativePath)) {
                return node_path.normalize(relativePath);
            }
            return node_path.join(workspaceRoot, relativePath);
        }
        return relativePath;
    }
}

class KeilProject implements IView, KeilProjectInfo {

    prjID: string;
    label: string;
    tooltip?: string | undefined;
    contextVal?: string | undefined = 'Project';
    icons?: { light: string; dark: string; } = {
        light: 'DeactiveApplication_16x',
        dark: 'DeactiveApplication_16x'
    };

    //-------------

    projectStorageDir: File; // Was vscodeDir
    uvprjFile: File;
    logger: Console;

    // uVison info
    uVsionFileInfo: uVisonInfo;

    private activeTargetName: string | undefined;
    private prevUpdateTime: number | undefined;

    protected _event: event.EventEmitter;
    protected watcher: FileWatcher;
    protected targetList: Target[];
    protected files: any[] = [];

    // KeilProject constructor needs ExtensionContext to determine globalStoragePath
    constructor(_uvprjFile: File, extensionContext: vscode.ExtensionContext) {
        this._event = new event.EventEmitter();
        this.uVsionFileInfo = <uVisonInfo>{};
        this.targetList = [];
        this.uvprjFile = _uvprjFile;
        this.prjID = getMD5(_uvprjFile.path);

        // Determine project-specific global storage path
        const globalStoragePath = extensionContext.globalStorageUri.fsPath;
        this.projectStorageDir = new File(node_path.join(globalStoragePath, this.prjID));
        try {
            if (!fs.existsSync(this.projectStorageDir.path)) {
                fs.mkdirSync(this.projectStorageDir.path, { recursive: true });
            }
        } catch (error) {
            console.error(`Keil Assistant: Failed to create project storage directory at ${this.projectStorageDir.path}`, error);
            // Fallback or error handling if directory creation fails - for now, log and continue
        }
        
        const logPath = node_path.join(this.projectStorageDir.path, 'keil-assistant.log');
        this.logger = new console.Console(fs.createWriteStream(logPath, { flags: 'a+' }));
        this.watcher = new FileWatcher(this.uvprjFile);
        this.label = _uvprjFile.noSuffixName;
        this.tooltip = _uvprjFile.path;
        this.logger.log(`[info] Log for project ${this.label} (${this.prjID}) at : ${Time.GetInstance().GetTimeStamp()}\r\n`);
        this.logger.log(`[info] Project-specific storage: ${this.projectStorageDir.path}`);
        this.watcher.OnChanged = () => {
            if (this.prevUpdateTime === undefined ||
                this.prevUpdateTime + 2000 < Date.now()) {
                this.prevUpdateTime = Date.now(); // reset update time
                setTimeout(() => this.onReload(), 300);
            }
        };
        this.watcher.Watch();
    }

    on(event: 'dataChanged', listener: () => void): void;
    on(event: any, listener: () => void): void {
        this._event.on(event, listener);
    }

    private async onReload() {
        try {
            this.targetList.forEach((target) => target.close());
            this.targetList = [];
            await this.load();
            this.notifyUpdateView();
        } catch (err) {
            // Add type check for err before accessing properties
            if (err && typeof err === 'object' && 'code' in err && err.code === 'EBUSY') {
                this.logger.log(`[Warn] uVision project file '${this.uvprjFile.name}' is locked !, delay 500 ms and retry !`);
                setTimeout(() => this.onReload(), 500);
            } else {
                // Use type guard for message access
                const message = err instanceof Error ? err.message : String(err);
                showMessage(`reload project failed !, msg: ${message}`, 'error');
            }
        }
    }

    async load() {

        const parser = new xml2js.Parser({ explicitArray: false });
        const doc = await parser.parseStringPromise({ toString: () => { return this.uvprjFile.Read(); } });
        const targets = doc['Project']['Targets']['Target'];

        // init uVsion info
        this.uVsionFileInfo.schemaVersion = doc['Project']['SchemaVersion'];

        if (isArray(targets)) {
            for (const target of targets) {
                const newTarget = await Target.getInstance(this, this.uVsionFileInfo, target);
                this.targetList.push(newTarget);
            }
        } else {
            const newTarget = await Target.getInstance(this, this.uVsionFileInfo, targets);
            this.targetList.push(newTarget);
        }

        for (const target of this.targetList) {
            await target.load();
            target.on('dataChanged', () => this.notifyUpdateView());
        }
    }

    notifyUpdateView() {
        this._event.emit('dataChanged');
    }

    close() {
        this.watcher.Close();
        this.targetList.forEach((target) => target.close());
        this.logger.log('[info] project closed: ' + this.label);
    }

    toAbsolutePath(rePath: string): string {
        const path = rePath.replace(/\//g, File.sep);
        // 如果路径已经是绝对路径，直接返回
        if (node_path.isAbsolute(path)) {
            // 清理可能存在的重复盘符
            return node_path.normalize(path.replace(/^[a-z]:\\[a-z]:\\/i, (match) => match.substring(0, 3)));
        }
        // 否则，将相对路径与项目目录拼接
        return node_path.normalize(node_path.join(this.uvprjFile.dir, path));
    }

    active() {
        this.icons = { light: 'ActiveApplication_16x', dark: 'ActiveApplication_16x' };
    }

    deactive() {
        this.icons = { light: 'DeactiveApplication_16x', dark: 'DeactiveApplication_16x' };
    }

    getTargetByName(name: string): Target | undefined {
        const index = this.targetList.findIndex((t) => { return t.targetName === name; });
        if (index !== -1) {
            return this.targetList[index];
        }
    }

    setActiveTarget(tName: string) {
        if (tName !== this.activeTargetName) {
            this.activeTargetName = tName;
            this.notifyUpdateView(); // notify data changed
        }
    }

    getActiveTarget(): Target | undefined {

        if (this.activeTargetName) {
            return this.getTargetByName(this.activeTargetName);
        }

        else if (this.targetList.length > 0) {
            return this.targetList[0];
        }
    }

    getChildViews(): IView[] | undefined {

        if (this.activeTargetName) {
            const target = this.getTargetByName(this.activeTargetName);
            if (target) {
                return [target];
            }
        }

        if (this.targetList.length > 0) {
            return [this.targetList[0]];
        }

        return undefined;
    }

    getTargets(): Target[] {
        return this.targetList;
    }

    private async loadFiles() {
        // ... existing code ...
        for (const file of this.files) {
            const relativePath = PathUtils.toRelativePath(file['FilePath']);
            const f = new File(PathUtils.toAbsolutePath(relativePath));
            // ... rest of the code ...
        }
        // ... existing code ...
    }
}

abstract class Target implements IView {

    prjID: string;
    label: string;
    tooltip?: string | undefined;
    contextVal?: string | undefined = 'Target';
    icons?: { light: string; dark: string; } = {
        light: 'Class_16x',
        dark: 'Class_16x'
    };

    //-------------

    readonly targetName: string;

    protected _event: event.EventEmitter;
    protected project: KeilProjectInfo;
    protected cppConfigName: string;
    protected targetDOM: any;
    protected uvInfo: uVisonInfo;
    protected fGroups: FileGroup[];
    protected includes: Set<string>;
    protected defines: Set<string>;

    private uv4LogFile: File;
    private uv4LogLockFileWatcher: FileWatcher;

    constructor(prjInfo: KeilProjectInfo, uvInfo: uVisonInfo, targetDOM: any) {
        this._event = new event.EventEmitter();
        this.project = prjInfo;
        this.targetDOM = targetDOM;
        this.uvInfo = uvInfo;
        this.prjID = prjInfo.prjID;
        this.targetName = targetDOM['TargetName'];
        this.label = this.targetName;
        this.tooltip = this.targetName;
        this.cppConfigName = this.targetName;
        this.includes = new Set();
        this.defines = new Set();
        this.fGroups = [];
        this.uv4LogFile = new File(node_path.join(this.project.projectStorageDir.path, 'uv4.log'));
        this.uv4LogLockFileWatcher = new FileWatcher(new File(this.uv4LogFile.path + '.lock'));

        if (!this.uv4LogLockFileWatcher.file.IsFile()) { // create file if not existed
            this.uv4LogLockFileWatcher.file.Write('');
        }

        this.uv4LogLockFileWatcher.Watch();
        this.uv4LogLockFileWatcher.OnChanged = () => this.updateSourceRefs();
        this.uv4LogLockFileWatcher.on('error', () => {

            this.uv4LogLockFileWatcher.Close();

            if (!this.uv4LogLockFileWatcher.file.IsFile()) { // create file if not existed
                this.uv4LogLockFileWatcher.file.Write('');
            }

            this.uv4LogLockFileWatcher.Watch();
        });
    }

    on(event: 'dataChanged', listener: () => void): void;
    on(event: any, listener: () => void): void {
        this._event.on(event, listener);
    }

    static async getInstance(prjInfo: KeilProjectInfo, uvInfo: uVisonInfo, targetDOM: any): Promise<Target> {
        // 检查是否是 C51 工程
        const isC51Project = targetDOM['TargetOption'] && 
                            targetDOM['TargetOption']['Target51'] && 
                            targetDOM['TargetOption']['Target51']['C51'];

        // 检查是否是 ARM 工程
        const isArmProject = targetDOM['TargetOption'] && 
                            (targetDOM['TargetOption']['TargetCommonOption'] || 
                             targetDOM['TargetOption']['TargetArmAds']);

        if (isC51Project && !isArmProject) {
            return new C51Target(prjInfo, uvInfo, targetDOM);
        } else if (isArmProject && !isC51Project) {
            return new ArmTarget(prjInfo, uvInfo, targetDOM);
        } else {
            // 如果无法确定工程类型，弹出选择对话框
            const selection = await vscode.window.showQuickPick([
                { label: 'C51 工程', description: '8051 系列单片机工程', target: 'C51' },
                { label: 'ARM 工程', description: 'ARM 系列单片机工程', target: 'ARM' }
            ], {
                placeHolder: '请选择工程类型',
                title: '无法自动识别工程类型，请手动选择'
            });

            if (!selection) {
                throw new Error('未选择工程类型');
            }

            return selection.target === 'C51' ? 
                new C51Target(prjInfo, uvInfo, targetDOM) : 
                new ArmTarget(prjInfo, uvInfo, targetDOM);
        }
    }

    private getDefCppProperties(): any {
        return {
            configurations: [
                {
                    name: this.cppConfigName,
                    includePath: undefined,
                    defines: undefined,
                    intelliSenseMode: '${default}'
                }
            ],
            version: 4
        };
    }

    private updateCppProperties() {

        // c_cpp_properties.json should be in the workspace .vscode directory for C/C++ extension compatibility
        let vscodeDir: string;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            vscodeDir = node_path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode');
        } else {
            // Fallback to project directory if no workspace
            vscodeDir = node_path.join(this.project.uvprjFile.dir, '.vscode');
        }
        
        // Ensure .vscode directory exists
        try {
            if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(vscodeDir, { recursive: true });
            }
        } catch (error) {
            this.project.logger.log(`[ERROR] Failed to create .vscode directory at ${vscodeDir}: ${error}`);
            // Fallback to global storage if .vscode creation fails
            vscodeDir = this.project.projectStorageDir.path;
        }

        const proFile = new File(node_path.join(vscodeDir, 'c_cpp_properties.json'));
        let obj: any;

        if (proFile.IsFile()) {
            try {
                obj = JSON.parse(proFile.Read());
            } catch (error) {
                this.project.logger.log(error);
                obj = this.getDefCppProperties();
            }
        } else {
            obj = this.getDefCppProperties();
        }

        const configList: any[] = obj['configurations'];
        const index = configList.findIndex((conf) => { return conf.name === this.cppConfigName; });

        if (index === -1) {
            configList.push({
                name: this.cppConfigName,
                includePath: Array.from(this.includes).concat(['${default}']),
                defines: Array.from(this.defines),
                intelliSenseMode: '${default}'
            });
        } else {
            configList[index]['includePath'] = Array.from(this.includes).concat(['${default}']);
            configList[index]['defines'] = Array.from(this.defines);
        }

        proFile.Write(JSON.stringify(obj, undefined, 4));
    }

    async load(): Promise<void> {

        // check target is valid
        const err = this.checkProject(this.targetDOM);
        if (err) { throw err; }

        const incListStr: string = this.getIncString(this.targetDOM);
        const defineListStr: string = this.getDefineString(this.targetDOM);
        const _groups: any = this.getGroups(this.targetDOM);
        const sysIncludes = this.getSystemIncludes(this.targetDOM);

        // set includes
        this.includes.clear();

        let incList = incListStr.split(';');
        if (sysIncludes) {
            incList = incList.concat(sysIncludes);
        }

        incList.forEach((path) => {
            const realPath = path.trim();
            if (realPath !== '') {
                this.includes.add(this.project.toAbsolutePath(realPath));
            }
        });

        // set defines
        this.defines.clear();

        // add user macros
        defineListStr.split(/,|\s+/).forEach((define) => {
            if (define.trim() !== '') {
                this.defines.add(define);
            }
        });

        // add system macros
        this.getSysDefines(this.targetDOM).forEach((define) => {
            this.defines.add(define);
        });

        // set file groups
        this.fGroups = [];

        let groups: any[];
        if (Array.isArray(_groups)) {
            groups = _groups;
        } else {
            groups = [_groups];
        }

        for (const group of groups) {

            if (group['Files'] !== undefined) {

                let isGroupExcluded = false;
                let fileList: any[];

                if (group['GroupOption']) { // check group is excluded
                    const gOption = group['GroupOption']['CommonProperty'];
                    if (gOption && gOption['IncludeInBuild'] === '0') {
                        isGroupExcluded = true;
                    }
                }

                const nGrp = new FileGroup(this.prjID, group['GroupName'], isGroupExcluded);

                if (Array.isArray(group['Files'])) {
                    fileList = [];
                    for (const files of group['Files']) {
                        if (Array.isArray(files['File'])) {
                            fileList = fileList.concat(files['File']);
                        }
                        else if (files['File'] !== undefined) {
                            fileList.push(files['File']);
                        }
                    }
                } else {
                    if (Array.isArray(group['Files']['File'])) {
                        fileList = group['Files']['File'];
                    }
                    else if (group['Files']['File'] !== undefined) {
                        fileList = [group['Files']['File']];
                    } else {
                        fileList = [];
                    }
                }

                for (const file of fileList) {
                    // 直接使用project.toAbsolutePath处理路径
                    const f = new File(this.project.toAbsolutePath(file['FilePath']));

                    let isFileExcluded = isGroupExcluded;
                    if (isFileExcluded === false && file['FileOption']) { // check file is enable
                        const fOption = file['FileOption']['CommonProperty'];
                        if (fOption && fOption['IncludeInBuild'] === '0') {
                            isFileExcluded = true;
                        }
                    }

                    const nFile = new Source(this.prjID, f, !isFileExcluded);
                    this.includes.add(f.dir);
                    nGrp.sources.push(nFile);
                }

                this.fGroups.push(nGrp);
            }
        }

        this.updateCppProperties();

        this.updateSourceRefs();
    }

    private quoteString(str: string, quote = '"'): string {
        return str.includes(' ') ? (quote + str + quote) : str;
    }

    private runTask(name: string, commands: string[]) {

        const resManager = ResourceManager.getInstance();
        let args: string[] = [];

        args.push('-o', this.uv4LogFile.path);
        args = args.concat(commands);

        // For VSCode 1.103+ compatibility, we use the command and args array approach
        // instead of building a single command line string
        const builderExe = resManager.getBuilderExe();

        // use task
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {

            const taskDefinition = { 
                type: 'keil-task', 
                prjID: this.project.prjID,       // Add prjID to definition
                targetName: this.targetName      // Add targetName to definition
            };
            // Using TaskScope.Workspace as project-specific details are in definition
            const task = new vscode.Task(taskDefinition, vscode.TaskScope.Workspace, name, 'shell'); 
            const options: vscode.ShellExecutionOptions = { cwd: this.project.uvprjFile.dir };
            
            // Use the command + args approach for better VSCode 1.103+ compatibility
            task.execution = new vscode.ShellExecution(builderExe, args, options);
            task.isBackground = false;
            // task.problemMatchers = this.getProblemMatcher(); // We will handle diagnostics manually

            // Clear previous diagnostics for this project/target when a new build starts
            diagnosticCollection.clear(); // Clears all diagnostics from this collection.
                                          // More granular clearing might be needed if multiple projects are handled.

            // Log debugging information for path resolution
            this.project.logger.log(`[DEBUG] Task CWD for '${name}': '${this.project.uvprjFile.dir}'`);
            const exampleCompilerPath = "..\\source\\main.c"; // Using a typical problematic path
            try {
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                    const resolvedPath = node_path.resolve(this.project.uvprjFile.dir, exampleCompilerPath);
                    this.project.logger.log(`[DEBUG] Resolved absolute path for '${exampleCompilerPath}' (from CWD): '${resolvedPath}'`);
                    const relativeToWorkspace = node_path.relative(workspaceRoot, resolvedPath);
                    this.project.logger.log(`[DEBUG] Path relative to workspace for '${exampleCompilerPath}': '${relativeToWorkspace}'`);
                } else {
                    this.project.logger.log(`[DEBUG] No workspace folder found, cannot calculate relative path.`);
                }
            } catch (e: any) {
                this.project.logger.log(`[DEBUG] Error during path resolution debug: ${e.message}`);
            }

            task.presentationOptions = {
                echo: false,
                focus: false,
                clear: true
            };
            vscode.tasks.executeTask(task);

            // After task execution, we'll need to parse the log and publish diagnostics.
            // This will be handled by listening to onDidEndTaskProcess or similar.
            // For now, let's add a placeholder for where this logic would be triggered.
            // TODO: Implement log parsing and diagnostic publishing via onDidEndTaskProcess
            // this.handleTaskCompletion(name); // This direct call will be removed/replaced


        } else {
            // Fallback for when no workspace is available - use terminal
            const index = vscode.window.terminals.findIndex((ter) => {
                return ter.name === name;
            });

            if (index !== -1) {
                vscode.window.terminals[index].hide();
                vscode.window.terminals[index].dispose();
            }

            const terminal = vscode.window.createTerminal(name);
            terminal.show();
            
            // Build command line for terminal execution
            const isCmd = /cmd.exe$/i.test(vscode.env.shell);
            const quote = isCmd ? '"' : '\'';
            const invokePrefix = isCmd ? '' : '& ';
            const cmdPrefixSuffix = isCmd ? '"' : '';

            let commandLine = invokePrefix + this.quoteString(builderExe, quote) + ' ';
            commandLine += args.map((arg) => { return this.quoteString(arg, quote); }).join(' ');
            
            terminal.sendText(cmdPrefixSuffix + commandLine + cmdPrefixSuffix);
        }
    }

    build() {
        this.runTask('build', this.getBuildCommand());
    }

    rebuild() {
        this.runTask('rebuild', this.getRebuildCommand());
    }

    download() {
        this.runTask('download', this.getDownloadCommand());
    }

    updateSourceRefs() {
        const rePath = this.getOutputFolder(this.targetDOM);
        if (rePath) {
            const outPath = this.project.toAbsolutePath(rePath);
            this.fGroups.forEach((group) => {
                group.sources.forEach((source) => {
                    if (source.enable) { // if source not disabled
                        const refFile = File.fromArray([outPath, source.file.noSuffixName + '.d']);
                        if (refFile.IsFile()) {
                            const refFileList = this.parseRefLines(this.targetDOM, refFile.Read().split(/\r\n|\n/))
                                .map((rePath) => { return this.project.toAbsolutePath(rePath); });
                            source.children = refFileList.map((refFilePath) => {
                                return new Source(source.prjID, new File(refFilePath));
                            });
                        }
                    }
                });
            });
            this._event.emit('dataChanged');
        }
    }

    close() {
        this.uv4LogLockFileWatcher.Close();
    }

    getChildViews(): IView[] | undefined {
        return this.fGroups;
    }

    protected abstract checkProject(target: any): Error | undefined;

    protected abstract getIncString(target: any): string;
    protected abstract getDefineString(target: any): string;
    protected abstract getSysDefines(target: any): string[];
    protected abstract getGroups(target: any): any[];
    protected abstract getSystemIncludes(target: any): string[] | undefined;

    protected abstract getOutputFolder(target: any): string | undefined;
    protected abstract parseRefLines(target: any, lines: string[]): string[];

    protected abstract getProblemMatcher(): string[];
    protected abstract getBuildCommand(): string[];
    protected abstract getRebuildCommand(): string[];
    protected abstract getDownloadCommand(): string[];

    protected getFilePath(filePath: string): string {
        return PathUtils.toAbsolutePath(PathUtils.toRelativePath(filePath));
    }

    protected abstract getDiagnosticRegex(): RegExp;

    public async processDiagnostics(): Promise<void> { // Changed to public
        this.project.logger.log(`[INFO] Target '${this.targetName}': Processing diagnostics from log file '${this.uv4LogFile.path}'...`);

        let logContent: string;
        try {
            logContent = this.uv4LogFile.Read(); 
        } catch (e: any) {
            this.project.logger.log(`[ERROR] Failed to read log file '${this.uv4LogFile.path}': ${e.message}`);
            return;
        }

        if (!logContent) {
            this.project.logger.log(`[INFO] Log file '${this.uv4LogFile.path}' is empty.`);
            return;
        }

        const diagnosticsMap: Map<string, vscode.Diagnostic[]> = new Map();
        const lines = logContent.split(/\r?\n/);
        const regex = this.getDiagnosticRegex();

        this.project.logger.log(`[DEBUG] Using regex for ${this.constructor.name}: ${regex}`);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = regex.exec(line);

            if (match) {
                const rawRelativePath = match[1];
                const lineNumber = parseInt(match[2], 10); 
                const severityWord = match[3].toLowerCase();
                const errorCode = match[4]; 
                const message = match[5];
                const fullMessage = `${errorCode}: ${message}`;
                
                const severity = severityWord === 'error' 
                                 ? vscode.DiagnosticSeverity.Error 
                                 : vscode.DiagnosticSeverity.Warning;

                if (rawRelativePath && !isNaN(lineNumber) && lineNumber > 0) {
                    try {
                        const absolutePath = this.project.toAbsolutePath(rawRelativePath);
                        const uri = vscode.Uri.file(absolutePath);
                        const range = new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 100); 

                        const diagnostic = new vscode.Diagnostic(range, fullMessage, severity);
                        diagnostic.source = `Keil ${this.constructor.name.replace('Target', '')} Compiler`;

                        if (!diagnosticsMap.has(uri.toString())) {
                            diagnosticsMap.set(uri.toString(), []);
                        }
                        diagnosticsMap.get(uri.toString())!.push(diagnostic);
                        this.project.logger.log(`[DEBUG] Found diagnostic: ${uri.fsPath}:${lineNumber} - ${fullMessage}`);

                    } catch (e: any) {
                        this.project.logger.log(`[ERROR] Error processing diagnostic line '${line}': ${e.message}`);
                    }
                } else {
                     this.project.logger.log(`[WARN] Could not parse diagnostic from line: ${line}`);
                }
            }
        }

        diagnosticsMap.forEach((diags, uriString) => {
            diagnosticCollection.set(vscode.Uri.parse(uriString), diags);
        });

        if (diagnosticsMap.size > 0) {
            this.project.logger.log(`[INFO] Published diagnostics for ${diagnosticsMap.size} file(s).`);
        } else {
            this.project.logger.log(`[INFO] No new diagnostics found in log file.`);
        }
    }
}

//===============================================

class C51Target extends Target {

    protected checkProject(target: any): Error | undefined {
        if (target['TargetOption']['Target51'] === undefined ||
            target['TargetOption']['Target51']['C51'] === undefined) {
            return new Error(`This uVision project is not a C51 project, but have a 'uvproj' suffix !`);
        }
    }

    protected parseRefLines(_target: any, _lines: string[]): string[] {
        return [];
    }

    protected getOutputFolder(_target: any): string | undefined {
        return undefined;
    }

    protected getSysDefines(_target: any): string[] {
        return [
            '__C51__',
            '__VSCODE_C51__',
            'reentrant=',
            'compact=',
            'small=',
            'large=',
            'data=',
            'idata=',
            'pdata=',
            'bdata=',
            'xdata=',
            'code=',
            'bit=char',
            'sbit=char',
            'sfr=char',
            'sfr16=int',
            'sfr32=int',
            'interrupt=',
            'using=',
            '_at_=',
            '_priority_=',
            '_task_='
        ];
    }

    protected getSystemIncludes(_target: any): string[] | undefined {
        const exeFile = new File(ResourceManager.getInstance().getC51UV4Path());
        if (exeFile.IsFile()) {
            return [
                node_path.dirname(exeFile.dir) + File.sep + 'C51' + File.sep + 'INC'
            ];
        }
        return undefined;
    }

    protected getIncString(target: any): string {
        const target51 = target['TargetOption']['Target51']['C51'];
        return target51['VariousControls']['IncludePath'];
    }

    protected getDefineString(target: any): string {
        const target51 = target['TargetOption']['Target51']['C51'];
        return target51['VariousControls']['Define'];
    }

    protected getGroups(target: any): any[] {
        return target['Groups']['Group'] || [];
    }

    protected getProblemMatcher(): string[] { // This method is no longer used for diagnostics but kept for structure
        return ['$c51'];
    }

    protected getDiagnosticRegex(): RegExp {
        return /^([^()]+)\(([\d]+)\):\s+(error|warning):\s+(#\d+):\s+(.+)$/i;
    }

    protected getBuildCommand(): string[] {
        const numCPUs = os.cpus().length;
        const jValue = Math.max(1, Math.min(numCPUs, 4)); // For C51, limit to 4 or numCPUs, whichever is smaller, but at least 1
        return [
            '--uv4Path', ResourceManager.getInstance().getC51UV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', `\${uv4Path} -b \${prjPath} -j${jValue} -t \${targetName}`
        ];
    }

    protected getRebuildCommand(): string[] {
        const numCPUs = os.cpus().length;
        const jValue = Math.max(1, Math.min(numCPUs, 4)); // For C51, limit to 4 or numCPUs, whichever is smaller, but at least 1
        return [
            '--uv4Path', ResourceManager.getInstance().getC51UV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', `\${uv4Path} -r \${prjPath} -j${jValue} -t \${targetName}`
        ];
    }

    protected getDownloadCommand(): string[] {
        return [
            '--uv4Path', ResourceManager.getInstance().getC51UV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', '${uv4Path} -f ${prjPath} -j0 -t ${targetName}'
        ];
    }
}

class MacroHandler {

    private regMatchers = {
        'normal_macro': /^#define (\w+) (.*)$/,
        'func_macro': /^#define (\w+\([^)]*\)) (.*)$/
    };

    toExpression(macro: string): string | undefined {

        let mList = this.regMatchers['normal_macro'].exec(macro);
        if (mList && mList.length > 2) {
            return `${mList[1]}=${mList[2]}`;
        }

        mList = this.regMatchers['func_macro'].exec(macro);
        if (mList && mList.length > 2) {
            return `${mList[1]}=`;
        }
    }
}

class ArmTarget extends Target {

    private static readonly armccMacros: string[] = [
        '__CC_ARM',
        '__arm__',
        '__align(x)=',
        '__ALIGNOF__(x)=',
        '__alignof__(x)=',
        '__asm(x)=',
        '__forceinline=',
        '__restrict=',
        '__global_reg(n)=',
        '__inline=',
        '__int64=long long',
        '__INTADDR__(expr)=0',
        '__irq=',
        '__packed=',
        '__pure=',
        '__smc(n)=',
        '__svc(n)=',
        '__svc_indirect(n)=',
        '__svc_indirect_r7(n)=',
        '__value_in_regs=',
        '__weak=',
        '__writeonly=',
        '__declspec(x)=',
        '__attribute__(x)=',
        '__nonnull__(x)=',
        '__register=',

        '__breakpoint(x)=',
        '__cdp(x,y,z)=',
        '__clrex()=',
        '__clz(x)=0U',
        '__current_pc()=0U',
        '__current_sp()=0U',
        '__disable_fiq()=',
        '__disable_irq()=',
        '__dmb(x)=',
        '__dsb(x)=',
        '__enable_fiq()=',
        '__enable_irq()=',
        '__fabs(x)=0.0',
        '__fabsf(x)=0.0f',
        '__force_loads()=',
        '__force_stores()=',
        '__isb(x)=',
        '__ldrex(x)=0U',
        '__ldrexd(x)=0U',
        '__ldrt(x)=0U',
        '__memory_changed()=',
        '__nop()=',
        '__pld(...)=',
        '__pli(...)=',
        '__qadd(x,y)=0',
        '__qdbl(x)=0',
        '__qsub(x,y)=0',
        '__rbit(x)=0U',
        '__rev(x)=0U',
        '__return_address()=0U',
        '__ror(x,y)=0U',
        '__schedule_barrier()=',
        '__semihost(x,y)=0',
        '__sqrt(x)=0.0',
        '__sqrtf(x)=0.0f',
        '__ssat(x,y)=0',
        '__strex(x,y)=0U',
        '__strexd(x,y)=0',
        '__strt(x,y)=',
        '__swp(x,y)=0U',
        '__usat(x,y)=0U',
        '__wfe()=',
        '__wfi()=',
        '__yield()=',
        '__vfp_status(x,y)=0'
    ];

    private static readonly armclangMacros: string[] = [
        '__alignof__(x)=',
        '__asm(x)=',
        '__asm__(x)=',
        '__forceinline=',
        '__restrict=',
        '__volatile__=',
        '__inline=',
        '__inline__=',
        '__declspec(x)=',
        '__attribute__(x)=',
        '__nonnull__(x)=',
        '__unaligned=',
        '__promise(x)=',
        '__irq=',
        '__swi=',
        '__weak=',
        '__register=',
        '__pure=',
        '__value_in_regs=',

        '__breakpoint(x)=',
        '__current_pc()=0U',
        '__current_sp()=0U',
        '__disable_fiq()=',
        '__disable_irq()=',
        '__enable_fiq()=',
        '__enable_irq()=',
        '__force_stores()=',
        '__memory_changed()=',
        '__schedule_barrier()=',
        '__semihost(x,y)=0',
        '__vfp_status(x,y)=0',

        '__builtin_arm_nop()=',
        '__builtin_arm_wfi()=',
        '__builtin_arm_wfe()=',
        '__builtin_arm_sev()=',
        '__builtin_arm_sevl()=',
        '__builtin_arm_yield()=',
        '__builtin_arm_isb(x)=',
        '__builtin_arm_dsb(x)=',
        '__builtin_arm_dmb(x)=',

        '__builtin_bswap32(x)=0U',
        '__builtin_bswap16(x)=0U',
        '__builtin_arm_rbit(x)=0U',

        '__builtin_clz(x)=0U',
        '__builtin_arm_ldrex(x)=0U',
        '__builtin_arm_strex(x,y)=0U',
        '__builtin_arm_clrex()=',
        '__builtin_arm_ssat(x,y)=0U',
        '__builtin_arm_usat(x,y)=0U',
        '__builtin_arm_ldaex(x)=0U',
        '__builtin_arm_stlex(x,y)=0U'
    ];

    private static armclangBuildinMacros: string[] | undefined;

    constructor(prjInfo: KeilProjectInfo, uvInfo: uVisonInfo, targetDOM: any) {
        super(prjInfo, uvInfo, targetDOM);
        ArmTarget.initArmclangMacros();
    }

    protected checkProject(): Error | undefined {
        return undefined;
    }

    protected getOutputFolder(target: any): string | undefined {
        try {
            return <string>target['TargetOption']['TargetCommonOption']['OutputDirectory'];
        } catch (error) {
            return undefined;
        }
    }

    private gnu_parseRefLines(lines: string[]): string[] {

        const resultList: Set<string> = new Set<string>();

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const _line = lines[lineIndex];

            const line = _line[_line.length - 1] === '\\' ? _line.substring(0, _line.length - 1) : _line; // remove char '\'
            const subLines = line.trim().split(/(?<![\\:]) /);

            if (lineIndex === 0) // first line
            {
                for (let i = 1; i < subLines.length; i++) // skip first sub line
                {
                    resultList.add(subLines[i].trim().replace(/\\ /g, " "));
                }
            }
            else  // other lines, first char is whitespace
            {
                subLines.forEach((item) => {
                    resultList.add(item.trim().replace(/\\ /g, " "));
                });
            }
        }

        return Array.from(resultList);
    }

    private ac5_parseRefLines(lines: string[], startIndex = 1): string[] {

        const resultList: Set<string> = new Set<string>();

        for (let i = startIndex; i < lines.length; i++) {
            const sepIndex = lines[i].indexOf(": ");
            if (sepIndex > 0) {
                const line: string = lines[i].substring(sepIndex + 1).trim();
                resultList.add(line);
            }
        }

        return Array.from(resultList);
    }

    protected parseRefLines(target: any, lines: string[]): string[] {
        if (target['uAC6'] === '1') { // ARMClang
            return this.gnu_parseRefLines(lines);
        } else { // ARMCC
            return this.ac5_parseRefLines(lines);
        }
    }

    private static initArmclangMacros() {
        if (ArmTarget.armclangBuildinMacros === undefined) {
            const armClangPath = node_path.dirname(node_path.dirname(ResourceManager.getInstance().getArmUV4Path()))
                + File.sep + 'ARM' + File.sep + 'ARMCLANG' + File.sep + 'bin' + File.sep + 'armclang.exe';
            ArmTarget.armclangBuildinMacros = ArmTarget.getArmClangMacroList(armClangPath);
        }
    }

    protected getSysDefines(target: any): string[] {
        if (target['uAC6'] === '1') { // ARMClang
            return ArmTarget.armclangMacros.concat(ArmTarget.armclangBuildinMacros || []);
        } else { // ARMCC
            return ArmTarget.armccMacros;
        }
    }

    private static getArmClangMacroList(armClangPath: string): string[] {
        try {
            const cmdLine = CmdLineHandler.quoteString(armClangPath, '"')
                + ' ' + ['--target=arm-arm-none-eabi', '-E', '-dM', '-', '<nul'].join(' ');

            const lines = child_process.execSync(cmdLine).toString().split(/\r\n|\n/);
            const resList: string[] = [];
            const mHandler = new MacroHandler();

            lines.filter((line) => { return line.trim() !== ''; })
                .forEach((line) => {
                    const value = mHandler.toExpression(line);
                    if (value) {
                        resList.push(value);
                    }
                });

            return resList;
        } catch (error) {
            return ['__GNUC__=4', '__GNUC_MINOR__=2', '__GNUC_PATCHLEVEL__=1'];
        }
    }

    protected getSystemIncludes(target: any): string[] | undefined {
        const exeFile = new File(ResourceManager.getInstance().getArmUV4Path());
        if (exeFile.IsFile()) {
            const toolName = target['uAC6'] === '1' ? 'ARMCLANG' : 'ARMCC';
            const incDir = new File(`${node_path.dirname(exeFile.dir)}${File.sep}ARM${File.sep}${toolName}${File.sep}include`);
            if (incDir.IsDir()) {
                return [incDir.path].concat(
                    incDir.GetList(File.EMPTY_FILTER).map((dir) => { return dir.path; }));
            }
            return [incDir.path];
        }
        return undefined;
    }

    protected getIncString(target: any): string {
        const dat = target['TargetOption']['TargetArmAds']['Cads'];
        return dat['VariousControls']['IncludePath'];
    }

    protected getDefineString(target: any): string {
        const dat = target['TargetOption']['TargetArmAds']['Cads'];
        return dat['VariousControls']['Define'];
    }

    protected getGroups(target: any): any[] {
        return target['Groups']['Group'] || [];
    }

    protected getProblemMatcher(): string[] { // This method is no longer used for diagnostics but kept for structure
        return ['$armcc', '$gcc'];
    }

    protected getDiagnosticRegex(): RegExp {
        return /^([^()]+)\(([\d]+)\):\s+(error|warning):\s+#([\d\w-]+):\s+(.+)$/i;
    }

    protected getBuildCommand(): string[] {
        const numCPUs = os.cpus().length;
        const jValue = Math.max(1, numCPUs); // For ARM, use all CPUs, but at least 1
        return [
            '--uv4Path', ResourceManager.getInstance().getArmUV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', `\${uv4Path} -b \${prjPath} -j${jValue} -t \${targetName}`
        ];
    }

    protected getRebuildCommand(): string[] {
        const numCPUs = os.cpus().length;
        const jValue = Math.max(1, numCPUs); // For ARM, use all CPUs, but at least 1
        return [
            '--uv4Path', ResourceManager.getInstance().getArmUV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', `\${uv4Path} -r \${prjPath} -j${jValue} -t \${targetName}`
        ];
    }

    protected getDownloadCommand(): string[] {
        return [
            '--uv4Path', ResourceManager.getInstance().getArmUV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', '${uv4Path} -f ${prjPath} -j0 -t ${targetName}'
        ];
    }
}

//================================================

class ProjectExplorer implements vscode.TreeDataProvider<IView>, vscode.Disposable {

    private ItemClickCommand = 'Item.Click';

    // Allow undefined/null for root refresh
    onDidChangeTreeData: vscode.Event<IView | undefined | null>;
    private viewEvent: vscode.EventEmitter<IView | undefined | null>;

    private prjList: Map<string, KeilProject>;
    private currentActiveProject: KeilProject | undefined;
    private buildStatusBarItem: vscode.StatusBarItem;
    private rebuildStatusBarItem: vscode.StatusBarItem;
    private downloadStatusBarItem: vscode.StatusBarItem;

    private extensionContext: vscode.ExtensionContext; // Store context

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context; // Store context
        this.prjList = new Map();
        this.viewEvent = new vscode.EventEmitter<IView | undefined | null>();
        this.onDidChangeTreeData = this.viewEvent.event;
        context.subscriptions.push(vscode.window.registerTreeDataProvider('project', this));
        context.subscriptions.push(vscode.commands.registerCommand(this.ItemClickCommand, (item: IView) => this.onItemClick(item)));

        // 创建状态栏项
        this.buildStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -8);
        this.buildStatusBarItem.text = "$(gear) Build";
        this.buildStatusBarItem.tooltip = "编译当前 Keil 工程";
        this.buildStatusBarItem.command = 'keil.build';

        this.rebuildStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -9);
        this.rebuildStatusBarItem.text = "$(refresh) Rebuild";
        this.rebuildStatusBarItem.tooltip = "重新编译当前 Keil 工程";
        this.rebuildStatusBarItem.command = 'keil.rebuild';

        this.downloadStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -10);
        this.downloadStatusBarItem.text = "$(cloud-upload) Download";
        this.downloadStatusBarItem.tooltip = "下载程序到目标设备";
        this.downloadStatusBarItem.command = 'keil.download';

        // 初始更新状态栏显示
        this.updateStatusBarVisibility();
    }

    private updateStatusBarVisibility(): void {
        const hasActiveProject = this.currentActiveProject !== undefined;
        if (hasActiveProject) {
            this.buildStatusBarItem.show();
            this.rebuildStatusBarItem.show();
            this.downloadStatusBarItem.show();
        } else {
            this.buildStatusBarItem.hide();
            this.rebuildStatusBarItem.hide();
            this.downloadStatusBarItem.hide();
        }
    }

    async loadWorkspace() {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const workspace = new File(workspaceRoot);
            
            if (workspace.IsDir()) {
                const excludeList = ResourceManager.getInstance().getProjectExcludeList();
                const workspaceFiles = workspace.GetList([/\.uvproj[x]?$/i], File.EMPTY_FILTER);
                
                // 获取工程文件位置列表并转换为相对路径
                const locationFiles = ResourceManager.getInstance().getProjectFileLocationList()
                    .map(loc => {
                        const absolutePath = loc;
                        const relativePath = node_path.relative(workspaceRoot, absolutePath);
                        return new File(node_path.join(workspaceRoot, relativePath));
                    });
                
                const uvList = workspaceFiles.concat(locationFiles)
                    .filter((file) => { return !excludeList.includes(file.name); });
                
                for (const uvFile of uvList) {
                    try {
                        await this.openProject(uvFile.path);
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        showMessage(`open project: '${uvFile.name}' failed !, msg: ${message}`, 'error');
                    }
                }
            }
        }
    }

    async openProject(path: string): Promise<KeilProject | undefined> {
        // Pass extensionContext to KeilProject constructor
        const nPrj = new KeilProject(new File(path), this.extensionContext); 
        if (!this.prjList.has(nPrj.prjID)) {
            await nPrj.load();
            nPrj.on('dataChanged', () => this.updateView());
            this.prjList.set(nPrj.prjID, nPrj);
            if (this.currentActiveProject == undefined) {
                this.currentActiveProject = nPrj;
                this.currentActiveProject.active();
            }
            this.updateView();
            this.updateStatusBarVisibility();
            return nPrj;
        }
        return undefined;
    }

    async closeProject(pID: string) {
        const prj = this.prjList.get(pID);
        if (prj) {
            prj.deactive();
            prj.close();
            this.prjList.delete(pID);
            if (this.currentActiveProject?.prjID === pID) {
                this.currentActiveProject = undefined;
            }
            this.updateView();
            this.updateStatusBarVisibility();
        }
    }

    async activeProject(view: IView) {
        const project = this.prjList.get(view.prjID);
        if (project) {
            this.currentActiveProject?.deactive();
            this.currentActiveProject = project;
            this.currentActiveProject.active();
            this.updateView();
            this.updateStatusBarVisibility();
        }
    }

    async switchTargetByProject(view: IView) {
        const prj = this.prjList.get(view.prjID);
        if (prj) {
            const tList = prj.getTargets();
            const targetName = await vscode.window.showQuickPick(tList.map((ele) => { return ele.targetName; }), {
                canPickMany: false,
                placeHolder: 'please select a target name for keil project'
            });
            if (targetName) {
                prj.setActiveTarget(targetName);
            }
        }
    }

    getTarget(view?: IView): Target | undefined {
        if (view) {
            const prj = this.prjList.get(view.prjID);
            if (prj) {
                const targets = prj.getTargets();
                const index = targets.findIndex((target) => { return target.targetName === view.label; });
                if (index !== -1) {
                    return targets[index];
                }
            }
        } else { // get active target
            if (this.currentActiveProject) {
                return this.currentActiveProject.getActiveTarget();
            } else {
                showMessage('Not found any active project !', 'warning');
            }
        }
    }

    updateView() {
        this.viewEvent.fire(undefined); // Pass undefined as argument
    }

    //----------------------------------

    itemClickInfo: any = undefined;

    private async onItemClick(item: IView) {
        switch (item.contextVal) {
            case 'Source':
                {
                    const source = <Source>item;
                    const file = new File(node_path.normalize(source.file.path));

                    if (file.IsFile()) { // file exist, open it
                        let isPreview = true;

                        if (this.itemClickInfo &&
                            this.itemClickInfo.name === file.path &&
                            this.itemClickInfo.time + 260 > Date.now()) {
                            isPreview = false;
                        }

                        // reset prev click info
                        this.itemClickInfo = {
                            name: file.path,
                            time: Date.now()
                        };

                        vscode.window.showTextDocument(vscode.Uri.parse(file.ToUri()), { preview: isPreview });
                    } else {
                        showMessage(`Not found file: ${source.file.path}`, 'warning');
                    }
                }
                break;
            default:
                break;
        }
    }

    getTreeItem(element: IView): vscode.TreeItem | Thenable<vscode.TreeItem> {

        const res = new vscode.TreeItem(element.label);

        res.contextValue = element.contextVal;
        res.tooltip = element.tooltip;
        res.collapsibleState = element.getChildViews() === undefined ?
            vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed;

        if (element instanceof Source) {
            res.command = {
                title: element.label,
                command: this.ItemClickCommand,
                arguments: [element]
            };
        }

        // Only set iconPath if both light and dark icons are found and valid
        if (element.icons) {
            const lightIconPath = ResourceManager.getInstance().getIconByName(element.icons.light);
            const darkIconPath = ResourceManager.getInstance().getIconByName(element.icons.dark);

            if (lightIconPath && darkIconPath) {
                try {
                    res.iconPath = {
                        light: vscode.Uri.file(lightIconPath),
                        dark: vscode.Uri.file(darkIconPath)
                    };
                } catch (e) {
                    // Log error if Uri creation fails, fallback to default icon
                    console.error(`Error creating icon Uri for ${element.label}:`, e);
                }
            }
        }
        return res;
    }

    getChildren(element?: IView | undefined): vscode.ProviderResult<IView[]> {
        if (element === undefined) {
            return Array.from(this.prjList.values());
        } else {
            return element.getChildViews();
        }
    }

    getCurrentActiveProject(): KeilProject | undefined {
        return this.currentActiveProject;
    }

    public getProjectById(prjID: string): KeilProject | undefined {
        return this.prjList.get(prjID);
    }

    dispose() {
        // Dispose of any resources managed by ProjectExplorer itself, if any.
        // TreeDataProvider and Commands pushed to context.subscriptions are disposed by VSCode.
        this.buildStatusBarItem.dispose();
        this.rebuildStatusBarItem.dispose();
        this.downloadStatusBarItem.dispose();
        this.prjList.forEach(prj => prj.close()); // Ensure projects are closed
        this.prjList.clear();
        this.viewEvent.dispose();
    }
}
