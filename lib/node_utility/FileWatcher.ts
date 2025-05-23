import { File } from "./File";
import * as fs from 'fs';
import * as events from "events";

export class FileWatcher {

    readonly file: File;
    private watcher?: fs.FSWatcher;
    private selfWatcher?: fs.FSWatcher;
    private isDir: boolean;
    private recursive: boolean;
    private _event: events.EventEmitter;

    OnRename?: (file: File) => void;
    OnChanged?: (file: File) => void;

    constructor(_file: File, _recursive: boolean = false) {
        this.file = _file;
        this.recursive = _recursive;
        this.isDir = this.file.IsDir();
        this._event = new events.EventEmitter();
    }

    on(event: 'error', listener: (err: Error) => void): this;
    on(event: any, listener: (arg?: any) => void): this {
        this._event.on(event, listener);
        return this;
    }

    Watch(): this {

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
                                this.OnRename(File.fromArray([this.file.path, filename]));
                            } else if (!this.isDir) {
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
                                this.OnChanged(File.fromArray([this.file.path, filename]));
                            } else if (!this.isDir) {
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
