"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceManager = void 0;
const vscode = require("vscode");
const File_1 = require("../lib/node_utility/File");
let _instance;
const dirList = [
    File_1.File.sep + 'bin',
    File_1.File.sep + 'res',
    File_1.File.sep + 'res' + File_1.File.sep + 'icons'
];
class ResourceManager {
    constructor(context) {
        this.extensionDir = new File_1.File(context.extensionPath);
        this.dirMap = new Map();
        this.iconMap = new Map();
        this.init();
    }
    static getInstance(context) {
        if (_instance === undefined) {
            if (context) {
                _instance = new ResourceManager(context);
            }
            else {
                throw Error('context can\'t be undefined');
            }
        }
        return _instance;
    }
    init() {
        // init dirs
        for (const path of dirList) {
            const f = new File_1.File(this.extensionDir.path + path);
            if (f.IsDir()) {
                this.dirMap.set(f.noSuffixName, f);
            }
        }
        // init icons
        const iconDir = this.dirMap.get('icons');
        if (iconDir) {
            for (const icon of iconDir.GetList([/\.svg$/i], File_1.File.EMPTY_FILTER)) {
                this.iconMap.set(icon.noSuffixName, icon.path);
            }
        }
    }
    getAppConfig() {
        return vscode.workspace.getConfiguration('KeilAssistant');
    }
    getBuilderExe() {
        var _a;
        return ((_a = this.dirMap.get('bin')) === null || _a === void 0 ? void 0 : _a.path) + File_1.File.sep + 'Uv4Caller.exe';
    }
    getC51UV4Path() {
        return this.getAppConfig().get('C51.Uv4Path') || 'null';
    }
    getArmUV4Path() {
        return this.getAppConfig().get('MDK.Uv4Path') || 'null';
    }
    getProjectExcludeList() {
        return this.getAppConfig().get('Project.ExcludeList') || [];
    }
    getProjectFileLocationList() {
        return this.getAppConfig().get('Project.FileLocationList') || [];
    }
    getIconByName(name) {
        return this.iconMap.get(name);
    }
}
exports.ResourceManager = ResourceManager;
//# sourceMappingURL=ResourceManager.js.map