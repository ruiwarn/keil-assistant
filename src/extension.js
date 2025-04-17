"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const crypto = require("crypto");
const xml2js = require("xml2js");
const event = require("events");
const fs = require("fs");
const node_path = require("path");
const child_process = require("child_process");
// import * as vscodeVariables from 'vscode-variables'; // Removed unused import
const File_1 = require("../lib/node_utility/File");
const ResourceManager_1 = require("./ResourceManager");
const FileWatcher_1 = require("../lib/node_utility/FileWatcher");
const Time_1 = require("../lib/node_utility/Time");
const util_1 = require("util");
const CmdLineHandler_1 = require("./CmdLineHandler");
function activate(context) {
    console.log('---- keil-assistant actived ----');
    // init resource
    ResourceManager_1.ResourceManager.getInstance(context);
    const prjExplorer = new ProjectExplorer(context);
    const subscriber = context.subscriptions;
    subscriber.push(vscode.commands.registerCommand('explorer.open', () => __awaiter(this, void 0, void 0, function* () {
        try {
            // 使用 VSCode API 在工作区内搜索 .uvproj 和 .uvprojx 文件
            const uvprojFiles = yield vscode.workspace.findFiles('**/*.uvproj', '**/node_modules/**');
            const uvprojxFiles = yield vscode.workspace.findFiles('**/*.uvprojx', '**/node_modules/**');
            const allFiles = [...uvprojFiles, ...uvprojxFiles];
            if (allFiles.length === 0) {
                vscode.window.showInformationMessage('工作区内没有找到 Keil 工程文件。');
                return;
            }
            if (allFiles.length === 1) {
                // 如果只找到一个工程文件，则自动打开
                const uvPrjPath = allFiles[0].fsPath;
                yield prjExplorer.openProject(uvPrjPath);
                // 切换工作区
                const result = yield vscode.window.showInformationMessage('Keil 工程加载完成！是否切换工作区？', '确定', '稍后');
                if (result === '确定') {
                    openWorkspace(new File_1.File(node_path.dirname(uvPrjPath)));
                }
            }
            else {
                // 如果找到多个工程文件，则弹出列表让用户选择
                const items = allFiles.map(file => ({
                    label: vscode.workspace.asRelativePath(file),
                    description: file.fsPath,
                    uri: file
                }));
                const selected = yield vscode.window.showQuickPick(items, {
                    placeHolder: '请选择一个 Keil 工程文件'
                });
                if (selected) {
                    const uvPrjPath = selected.uri.fsPath;
                    yield prjExplorer.openProject(uvPrjPath);
                    // 切换工作区
                    const result = yield vscode.window.showInformationMessage('Keil 工程加载完成！是否切换工作区？', '确定', '稍后');
                    if (result === '确定') {
                        openWorkspace(new File_1.File(node_path.dirname(uvPrjPath)));
                    }
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`打开工程失败！错误信息: ${error.message}`);
        }
    })));
    subscriber.push(vscode.commands.registerCommand('project.close', (item) => prjExplorer.closeProject(item.prjID)));
    subscriber.push(vscode.commands.registerCommand('project.build', (item) => { var _a; return (_a = prjExplorer.getTarget(item)) === null || _a === void 0 ? void 0 : _a.build(); }));
    subscriber.push(vscode.commands.registerCommand('project.rebuild', (item) => { var _a; return (_a = prjExplorer.getTarget(item)) === null || _a === void 0 ? void 0 : _a.rebuild(); }));
    subscriber.push(vscode.commands.registerCommand('project.download', (item) => { var _a; return (_a = prjExplorer.getTarget(item)) === null || _a === void 0 ? void 0 : _a.download(); }));
    subscriber.push(vscode.commands.registerCommand('item.copyValue', (item) => vscode.env.clipboard.writeText(item.tooltip || '')));
    subscriber.push(vscode.commands.registerCommand('project.switch', (item) => prjExplorer.switchTargetByProject(item)));
    subscriber.push(vscode.commands.registerCommand('project.active', (item) => prjExplorer.activeProject(item)));
    prjExplorer.loadWorkspace();
}
exports.activate = activate;
function deactivate() {
    console.log('---- keil-assistant closed ----');
}
exports.deactivate = deactivate;
//==================== Global Func===========================
function getMD5(data) {
    const md5 = crypto.createHash('md5');
    md5.update(data);
    return md5.digest('hex');
}
function openWorkspace(wsFile) {
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(wsFile.ToUri()));
}
//===============================================
class Source {
    constructor(pID, f, _enable = true) {
        this.contextVal = 'Source';
        this.prjID = pID;
        this.enable = _enable;
        this.file = f;
        this.label = this.file.name;
        this.tooltip = f.path;
        let iconName = '';
        if (f.IsFile() === false) {
            iconName = 'FileWarning_16x';
        }
        else if (_enable === false) {
            iconName = 'FileExclude_16x';
        }
        else {
            iconName = this.getIconBySuffix(f.suffix.toLowerCase());
        }
        this.icons = {
            dark: iconName,
            light: iconName
        };
    }
    getIconBySuffix(suffix) {
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
    getChildViews() {
        return this.children;
    }
}
class FileGroup {
    constructor(pID, gName, disabled) {
        this.contextVal = 'FileGroup';
        this.label = gName;
        this.prjID = pID;
        this.sources = [];
        this.tooltip = gName;
        const iconName = disabled ? 'FolderExclude_32x' : 'Folder_32x';
        this.icons = { light: iconName, dark: iconName };
    }
    getChildViews() {
        return this.sources;
    }
}
class KeilProject {
    constructor(_uvprjFile) {
        this.contextVal = 'Project';
        this.icons = {
            light: 'DeactiveApplication_16x',
            dark: 'DeactiveApplication_16x'
        };
        this._event = new event.EventEmitter();
        this.uVsionFileInfo = {};
        this.targetList = [];
        this.vscodeDir = new File_1.File(_uvprjFile.dir + File_1.File.sep + '.vscode');
        this.vscodeDir.CreateDir();
        const logPath = this.vscodeDir.path + File_1.File.sep + 'keil-assistant.log';
        this.logger = new console.Console(fs.createWriteStream(logPath, { flags: 'a+' }));
        this.uvprjFile = _uvprjFile;
        this.watcher = new FileWatcher_1.FileWatcher(this.uvprjFile);
        this.prjID = getMD5(_uvprjFile.path);
        this.label = _uvprjFile.noSuffixName;
        this.tooltip = _uvprjFile.path;
        this.logger.log('[info] Log at : ' + Time_1.Time.GetInstance().GetTimeStamp() + '\r\n');
        this.watcher.OnChanged = () => {
            if (this.prevUpdateTime === undefined ||
                this.prevUpdateTime + 2000 < Date.now()) {
                this.prevUpdateTime = Date.now(); // reset update time
                setTimeout(() => this.onReload(), 300);
            }
        };
        this.watcher.Watch();
    }
    on(event, listener) {
        this._event.on(event, listener);
    }
    onReload() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.targetList.forEach((target) => target.close());
                this.targetList = [];
                yield this.load();
                this.notifyUpdateView();
            }
            catch (err) {
                // Add type check for err before accessing properties
                if (err && typeof err === 'object' && 'code' in err && err.code === 'EBUSY') {
                    this.logger.log(`[Warn] uVision project file '${this.uvprjFile.name}' is locked !, delay 500 ms and retry !`);
                    setTimeout(() => this.onReload(), 500);
                }
                else {
                    // Use type guard for message access
                    const message = err instanceof Error ? err.message : String(err);
                    vscode.window.showErrorMessage(`reload project failed !, msg: ${message}`);
                }
            }
        });
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            const parser = new xml2js.Parser({ explicitArray: false });
            const doc = yield parser.parseStringPromise({ toString: () => { return this.uvprjFile.Read(); } });
            const targets = doc['Project']['Targets']['Target'];
            // init uVsion info
            this.uVsionFileInfo.schemaVersion = doc['Project']['SchemaVersion'];
            if ((0, util_1.isArray)(targets)) {
                for (const target of targets) {
                    this.targetList.push(Target.getInstance(this, this.uVsionFileInfo, target));
                }
            }
            else {
                this.targetList.push(Target.getInstance(this, this.uVsionFileInfo, targets));
            }
            for (const target of this.targetList) {
                yield target.load();
                target.on('dataChanged', () => this.notifyUpdateView());
            }
        });
    }
    notifyUpdateView() {
        this._event.emit('dataChanged');
    }
    close() {
        this.watcher.Close();
        this.targetList.forEach((target) => target.close());
        this.logger.log('[info] project closed: ' + this.label);
    }
    toAbsolutePath(rePath) {
        const path = rePath.replace(/\//g, File_1.File.sep);
        if (/^[a-z]:/i.test(path)) {
            return node_path.normalize(path);
        }
        return node_path.normalize(this.uvprjFile.dir + File_1.File.sep + path);
    }
    active() {
        this.icons = { light: 'ActiveApplication_16x', dark: 'ActiveApplication_16x' };
    }
    deactive() {
        this.icons = { light: 'DeactiveApplication_16x', dark: 'DeactiveApplication_16x' };
    }
    getTargetByName(name) {
        const index = this.targetList.findIndex((t) => { return t.targetName === name; });
        if (index !== -1) {
            return this.targetList[index];
        }
    }
    setActiveTarget(tName) {
        if (tName !== this.activeTargetName) {
            this.activeTargetName = tName;
            this.notifyUpdateView(); // notify data changed
        }
    }
    getActiveTarget() {
        if (this.activeTargetName) {
            return this.getTargetByName(this.activeTargetName);
        }
        else if (this.targetList.length > 0) {
            return this.targetList[0];
        }
    }
    getChildViews() {
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
    getTargets() {
        return this.targetList;
    }
}
class Target {
    constructor(prjInfo, uvInfo, targetDOM) {
        this.contextVal = 'Target';
        this.icons = {
            light: 'Class_16x',
            dark: 'Class_16x'
        };
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
        this.uv4LogFile = new File_1.File(this.project.vscodeDir.path + File_1.File.sep + 'uv4.log');
        this.uv4LogLockFileWatcher = new FileWatcher_1.FileWatcher(new File_1.File(this.uv4LogFile.path + '.lock'));
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
    on(event, listener) {
        this._event.on(event, listener);
    }
    static getInstance(prjInfo, uvInfo, targetDOM) {
        if (prjInfo.uvprjFile.suffix.toLowerCase() === '.uvproj') {
            return new C51Target(prjInfo, uvInfo, targetDOM);
        }
        else {
            return new ArmTarget(prjInfo, uvInfo, targetDOM);
        }
    }
    getDefCppProperties() {
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
    updateCppProperties() {
        const proFile = new File_1.File(this.project.vscodeDir.path + File_1.File.sep + 'c_cpp_properties.json');
        let obj;
        if (proFile.IsFile()) {
            try {
                obj = JSON.parse(proFile.Read());
            }
            catch (error) {
                this.project.logger.log(error);
                obj = this.getDefCppProperties();
            }
        }
        else {
            obj = this.getDefCppProperties();
        }
        const configList = obj['configurations'];
        const index = configList.findIndex((conf) => { return conf.name === this.cppConfigName; });
        if (index === -1) {
            configList.push({
                name: this.cppConfigName,
                includePath: Array.from(this.includes).concat(['${default}']),
                defines: Array.from(this.defines),
                intelliSenseMode: '${default}'
            });
        }
        else {
            configList[index]['includePath'] = Array.from(this.includes).concat(['${default}']);
            configList[index]['defines'] = Array.from(this.defines);
        }
        proFile.Write(JSON.stringify(obj, undefined, 4));
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            // check target is valid
            const err = this.checkProject(this.targetDOM);
            if (err) {
                throw err;
            }
            const incListStr = this.getIncString(this.targetDOM);
            const defineListStr = this.getDefineString(this.targetDOM);
            const _groups = this.getGroups(this.targetDOM);
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
            let groups;
            if (Array.isArray(_groups)) {
                groups = _groups;
            }
            else {
                groups = [_groups];
            }
            for (const group of groups) {
                if (group['Files'] !== undefined) {
                    let isGroupExcluded = false;
                    let fileList;
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
                    }
                    else {
                        if (Array.isArray(group['Files']['File'])) {
                            fileList = group['Files']['File'];
                        }
                        else if (group['Files']['File'] !== undefined) {
                            fileList = [group['Files']['File']];
                        }
                        else {
                            fileList = [];
                        }
                    }
                    for (const file of fileList) {
                        const f = new File_1.File(this.project.toAbsolutePath(file['FilePath']));
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
        });
    }
    quoteString(str, quote = '"') {
        return str.includes(' ') ? (quote + str + quote) : str;
    }
    runTask(name, commands) {
        const resManager = ResourceManager_1.ResourceManager.getInstance();
        let args = [];
        args.push('-o', this.uv4LogFile.path);
        args = args.concat(commands);
        const isCmd = /cmd.exe$/i.test(vscode.env.shell);
        const quote = isCmd ? '"' : '\'';
        const invokePrefix = isCmd ? '' : '& ';
        const cmdPrefixSuffix = isCmd ? '"' : '';
        let commandLine = invokePrefix + this.quoteString(resManager.getBuilderExe(), quote) + ' ';
        commandLine += args.map((arg) => { return this.quoteString(arg, quote); }).join(' ');
        // use task
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const task = new vscode.Task({ type: 'keil-task' }, vscode.TaskScope.Global, name, 'shell');
            task.execution = new vscode.ShellExecution(cmdPrefixSuffix + commandLine + cmdPrefixSuffix);
            task.isBackground = false;
            task.problemMatchers = this.getProblemMatcher();
            task.presentationOptions = {
                echo: false,
                focus: false,
                clear: true
            };
            vscode.tasks.executeTask(task);
        }
        else {
            const index = vscode.window.terminals.findIndex((ter) => {
                return ter.name === name;
            });
            if (index !== -1) {
                vscode.window.terminals[index].hide();
                vscode.window.terminals[index].dispose();
            }
            const terminal = vscode.window.createTerminal(name);
            terminal.show();
            terminal.sendText(commandLine);
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
                        const refFile = File_1.File.fromArray([outPath, source.file.noSuffixName + '.d']);
                        if (refFile.IsFile()) {
                            const refFileList = this.parseRefLines(this.targetDOM, refFile.Read().split(/\r\n|\n/))
                                .map((rePath) => { return this.project.toAbsolutePath(rePath); });
                            source.children = refFileList.map((refFilePath) => {
                                return new Source(source.prjID, new File_1.File(refFilePath));
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
    getChildViews() {
        return this.fGroups;
    }
}
//===============================================
class C51Target extends Target {
    checkProject(target) {
        if (target['TargetOption']['Target51'] === undefined ||
            target['TargetOption']['Target51']['C51'] === undefined) {
            return new Error(`This uVision project is not a C51 project, but have a 'uvproj' suffix !`);
        }
    }
    parseRefLines(_target, _lines) {
        return [];
    }
    getOutputFolder(_target) {
        return undefined;
    }
    getSysDefines(_target) {
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
    getSystemIncludes(_target) {
        const exeFile = new File_1.File(ResourceManager_1.ResourceManager.getInstance().getC51UV4Path());
        if (exeFile.IsFile()) {
            return [
                node_path.dirname(exeFile.dir) + File_1.File.sep + 'C51' + File_1.File.sep + 'INC'
            ];
        }
        return undefined;
    }
    getIncString(target) {
        const target51 = target['TargetOption']['Target51']['C51'];
        return target51['VariousControls']['IncludePath'];
    }
    getDefineString(target) {
        const target51 = target['TargetOption']['Target51']['C51'];
        return target51['VariousControls']['Define'];
    }
    getGroups(target) {
        return target['Groups']['Group'] || [];
    }
    getProblemMatcher() {
        return ['$c51'];
    }
    getBuildCommand() {
        return [
            '--uv4Path', ResourceManager_1.ResourceManager.getInstance().getC51UV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', '${uv4Path} -b ${prjPath} -j0 -t ${targetName}'
        ];
    }
    getRebuildCommand() {
        return [
            '--uv4Path', ResourceManager_1.ResourceManager.getInstance().getC51UV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', '${uv4Path} -r ${prjPath} -j0 -t ${targetName}'
        ];
    }
    getDownloadCommand() {
        return [
            '--uv4Path', ResourceManager_1.ResourceManager.getInstance().getC51UV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', '${uv4Path} -f ${prjPath} -j0 -t ${targetName}'
        ];
    }
}
class MacroHandler {
    constructor() {
        this.regMatchers = {
            'normal_macro': /^#define (\w+) (.*)$/,
            'func_macro': /^#define (\w+\([^)]*\)) (.*)$/
        };
    }
    toExpression(macro) {
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
    constructor(prjInfo, uvInfo, targetDOM) {
        super(prjInfo, uvInfo, targetDOM);
        ArmTarget.initArmclangMacros();
    }
    checkProject() {
        return undefined;
    }
    getOutputFolder(target) {
        try {
            return target['TargetOption']['TargetCommonOption']['OutputDirectory'];
        }
        catch (error) {
            return undefined;
        }
    }
    gnu_parseRefLines(lines) {
        const resultList = new Set();
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
            else // other lines, first char is whitespace
             {
                subLines.forEach((item) => {
                    resultList.add(item.trim().replace(/\\ /g, " "));
                });
            }
        }
        return Array.from(resultList);
    }
    ac5_parseRefLines(lines, startIndex = 1) {
        const resultList = new Set();
        for (let i = startIndex; i < lines.length; i++) {
            const sepIndex = lines[i].indexOf(": ");
            if (sepIndex > 0) {
                const line = lines[i].substring(sepIndex + 1).trim();
                resultList.add(line);
            }
        }
        return Array.from(resultList);
    }
    parseRefLines(target, lines) {
        if (target['uAC6'] === '1') { // ARMClang
            return this.gnu_parseRefLines(lines);
        }
        else { // ARMCC
            return this.ac5_parseRefLines(lines);
        }
    }
    static initArmclangMacros() {
        if (ArmTarget.armclangBuildinMacros === undefined) {
            const armClangPath = node_path.dirname(node_path.dirname(ResourceManager_1.ResourceManager.getInstance().getArmUV4Path()))
                + File_1.File.sep + 'ARM' + File_1.File.sep + 'ARMCLANG' + File_1.File.sep + 'bin' + File_1.File.sep + 'armclang.exe';
            ArmTarget.armclangBuildinMacros = ArmTarget.getArmClangMacroList(armClangPath);
        }
    }
    getSysDefines(target) {
        if (target['uAC6'] === '1') { // ARMClang
            return ArmTarget.armclangMacros.concat(ArmTarget.armclangBuildinMacros || []);
        }
        else { // ARMCC
            return ArmTarget.armccMacros;
        }
    }
    static getArmClangMacroList(armClangPath) {
        try {
            const cmdLine = CmdLineHandler_1.CmdLineHandler.quoteString(armClangPath, '"')
                + ' ' + ['--target=arm-arm-none-eabi', '-E', '-dM', '-', '<nul'].join(' ');
            const lines = child_process.execSync(cmdLine).toString().split(/\r\n|\n/);
            const resList = [];
            const mHandler = new MacroHandler();
            lines.filter((line) => { return line.trim() !== ''; })
                .forEach((line) => {
                const value = mHandler.toExpression(line);
                if (value) {
                    resList.push(value);
                }
            });
            return resList;
        }
        catch (error) {
            return ['__GNUC__=4', '__GNUC_MINOR__=2', '__GNUC_PATCHLEVEL__=1'];
        }
    }
    getSystemIncludes(target) {
        const exeFile = new File_1.File(ResourceManager_1.ResourceManager.getInstance().getArmUV4Path());
        if (exeFile.IsFile()) {
            const toolName = target['uAC6'] === '1' ? 'ARMCLANG' : 'ARMCC';
            const incDir = new File_1.File(`${node_path.dirname(exeFile.dir)}${File_1.File.sep}ARM${File_1.File.sep}${toolName}${File_1.File.sep}include`);
            if (incDir.IsDir()) {
                return [incDir.path].concat(incDir.GetList(File_1.File.EMPTY_FILTER).map((dir) => { return dir.path; }));
            }
            return [incDir.path];
        }
        return undefined;
    }
    getIncString(target) {
        const dat = target['TargetOption']['TargetArmAds']['Cads'];
        return dat['VariousControls']['IncludePath'];
    }
    getDefineString(target) {
        const dat = target['TargetOption']['TargetArmAds']['Cads'];
        return dat['VariousControls']['Define'];
    }
    getGroups(target) {
        return target['Groups']['Group'] || [];
    }
    getProblemMatcher() {
        return ['$armcc', '$gcc'];
    }
    getBuildCommand() {
        return [
            '--uv4Path', ResourceManager_1.ResourceManager.getInstance().getArmUV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', '${uv4Path} -b ${prjPath} -j0 -t ${targetName}'
        ];
    }
    getRebuildCommand() {
        return [
            '--uv4Path', ResourceManager_1.ResourceManager.getInstance().getArmUV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', '${uv4Path} -r ${prjPath} -j0 -t ${targetName}'
        ];
    }
    getDownloadCommand() {
        return [
            '--uv4Path', ResourceManager_1.ResourceManager.getInstance().getArmUV4Path(),
            '--prjPath', this.project.uvprjFile.path,
            '--targetName', this.targetName,
            '-c', '${uv4Path} -f ${prjPath} -j0 -t ${targetName}'
        ];
    }
}
ArmTarget.armccMacros = [
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
    '__sev()=',
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
ArmTarget.armclangMacros = [
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
//================================================
class ProjectExplorer {
    constructor(context) {
        this.ItemClickCommand = 'Item.Click';
        //----------------------------------
        this.itemClickInfo = undefined;
        this.prjList = new Map();
        // Correct EventEmitter type
        this.viewEvent = new vscode.EventEmitter();
        this.onDidChangeTreeData = this.viewEvent.event;
        context.subscriptions.push(vscode.window.registerTreeDataProvider('project', this));
        context.subscriptions.push(vscode.commands.registerCommand(this.ItemClickCommand, (item) => this.onItemClick(item)));
    }
    loadWorkspace() {
        return __awaiter(this, void 0, void 0, function* () {
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                const wsFilePath = vscode.workspace.workspaceFile && /^file:/.test(vscode.workspace.workspaceFile.toString()) ?
                    node_path.dirname(vscode.workspace.workspaceFile.fsPath) : vscode.workspace.workspaceFolders[0].uri.fsPath;
                const workspace = new File_1.File(wsFilePath);
                if (workspace.IsDir()) {
                    const excludeList = ResourceManager_1.ResourceManager.getInstance().getProjectExcludeList();
                    const workspaceFiles = workspace.GetList([/\.uvproj[x]?$/i], File_1.File.EMPTY_FILTER);
                    // Convert string locations to File objects before concatenating
                    const locationFiles = ResourceManager_1.ResourceManager.getInstance().getProjectFileLocationList()
                        .map(loc => new File_1.File(loc)); // Assuming new File(path) works
                    const uvList = workspaceFiles.concat(locationFiles)
                        .filter((file) => { return !excludeList.includes(file.name); });
                    for (const uvFile of uvList) {
                        try {
                            // Removed vscodeVariables call, assuming uvFile.path is already resolved
                            yield this.openProject(uvFile.path);
                        }
                        catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            vscode.window.showErrorMessage(`open project: '${uvFile.name}' failed !, msg: ${message}`);
                        }
                    }
                }
            }
        });
    }
    openProject(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const nPrj = new KeilProject(new File_1.File(path));
            if (!this.prjList.has(nPrj.prjID)) {
                yield nPrj.load();
                nPrj.on('dataChanged', () => this.updateView());
                this.prjList.set(nPrj.prjID, nPrj);
                if (this.currentActiveProject == undefined) {
                    this.currentActiveProject = nPrj;
                    this.currentActiveProject.active();
                }
                this.updateView();
                return nPrj;
            }
        });
    }
    closeProject(pID) {
        return __awaiter(this, void 0, void 0, function* () {
            const prj = this.prjList.get(pID);
            if (prj) {
                prj.deactive();
                prj.close();
                this.prjList.delete(pID);
                this.updateView();
            }
        });
    }
    activeProject(view) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const project = this.prjList.get(view.prjID);
            if (project) {
                (_a = this.currentActiveProject) === null || _a === void 0 ? void 0 : _a.deactive();
                this.currentActiveProject = project;
                (_b = this.currentActiveProject) === null || _b === void 0 ? void 0 : _b.active();
                this.updateView();
            }
        });
    }
    switchTargetByProject(view) {
        return __awaiter(this, void 0, void 0, function* () {
            const prj = this.prjList.get(view.prjID);
            if (prj) {
                const tList = prj.getTargets();
                const targetName = yield vscode.window.showQuickPick(tList.map((ele) => { return ele.targetName; }), {
                    canPickMany: false,
                    placeHolder: 'please select a target name for keil project'
                });
                if (targetName) {
                    prj.setActiveTarget(targetName);
                }
            }
        });
    }
    getTarget(view) {
        if (view) {
            const prj = this.prjList.get(view.prjID);
            if (prj) {
                const targets = prj.getTargets();
                const index = targets.findIndex((target) => { return target.targetName === view.label; });
                if (index !== -1) {
                    return targets[index];
                }
            }
        }
        else { // get active target
            if (this.currentActiveProject) {
                return this.currentActiveProject.getActiveTarget();
            }
            else {
                vscode.window.showWarningMessage('Not found any active project !');
            }
        }
    }
    updateView() {
        this.viewEvent.fire(undefined); // Pass undefined as argument
    }
    onItemClick(item) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (item.contextVal) {
                case 'Source':
                    {
                        const source = item;
                        const file = new File_1.File(node_path.normalize(source.file.path));
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
                        }
                        else {
                            vscode.window.showWarningMessage(`Not found file: ${source.file.path}`);
                        }
                    }
                    break;
                default:
                    break;
            }
        });
    }
    getTreeItem(element) {
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
            const lightIconPath = ResourceManager_1.ResourceManager.getInstance().getIconByName(element.icons.light);
            const darkIconPath = ResourceManager_1.ResourceManager.getInstance().getIconByName(element.icons.dark);
            if (lightIconPath && darkIconPath) {
                try {
                    res.iconPath = {
                        light: vscode.Uri.file(lightIconPath),
                        dark: vscode.Uri.file(darkIconPath)
                    };
                }
                catch (e) {
                    // Log error if Uri creation fails, fallback to default icon
                    console.error(`Error creating icon Uri for ${element.label}:`, e);
                }
            }
        }
        return res;
    }
    getChildren(element) {
        if (element === undefined) {
            return Array.from(this.prjList.values());
        }
        else {
            return element.getChildViews();
        }
    }
}
//# sourceMappingURL=extension.js.map