"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWatcher = void 0;
const File_1 = require("./File");
const fs = require("fs");
const events = require("events");
class FileWatcher {
    constructor(_file, _recursive = false) {
        this.file = _file;
        this.recursive = _recursive;
        this.isDir = this.file.IsDir();
        this._event = new events.EventEmitter();
    }
    on(event, listener) {
        this._event.on(event, listener);
        return this;
    }
    Watch() {
        if (this.isDir && this.selfWatcher === undefined) {
            this.selfWatcher = fs.watch(this.file.dir, { recursive: false }, (event, fname) => {
                if (event === 'rename' && fname === this.file.name && this.OnRename) {
                    this.OnRename(this.file);
                }
            });
            this.selfWatcher.on('error', (err) => {
                this._event.emit('error', err);
            });
        }
        if (this.watcher === undefined) {
            this.watcher = fs.watch(this.file.path, { recursive: this.recursive }, (event, filename) => {
                switch (event) {
                    case 'rename':
                        // Check if filename is not null before using it
                        if (this.OnRename) {
                            if (this.isDir && filename) {
                                this.OnRename(File_1.File.fromArray([this.file.path, filename]));
                            }
                            else if (!this.isDir) {
                                this.OnRename(this.file);
                            }
                            // If this.isDir is true but filename is null, we might need specific handling or ignore it.
                            // Currently ignoring if filename is null for a directory rename event.
                        }
                        break;
                    case 'change':
                        // Check if filename is not null before using it
                        if (this.OnChanged) {
                            if (this.isDir && filename) {
                                this.OnChanged(File_1.File.fromArray([this.file.path, filename]));
                            }
                            else if (!this.isDir) {
                                this.OnChanged(this.file);
                            }
                            // If this.isDir is true but filename is null, we might need specific handling or ignore it.
                            // Currently ignoring if filename is null for a directory change event.
                        }
                        break;
                }
            });
            this.watcher.on('error', (err) => {
                this._event.emit('error', err);
            });
        }
        return this;
    }
    Close() {
        if (this.selfWatcher) {
            this.selfWatcher.close();
            this.selfWatcher = undefined;
        }
        if (this.watcher) {
            this.watcher.close();
            this.watcher = undefined;
        }
    }
}
exports.FileWatcher = FileWatcher;
//# sourceMappingURL=FileWatcher.js.map