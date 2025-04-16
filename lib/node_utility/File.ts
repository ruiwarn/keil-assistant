import * as Path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export class File {

    static sep = Path.sep;
    static delimiter = Path.delimiter;
    static EMPTY_FILTER: RegExp[] = [];

    readonly name: string;          // example 'demo.cpp'
    readonly noSuffixName: string;  // example 'demo'
    readonly suffix: string;        // example '.cpp'
    readonly dir: string;           // example 'd:\\dir'
    readonly path: string;          // example 'd:\\dir\\demo.cpp'

    constructor(fPath: string) {
        this.path = fPath;
        this.name = Path.basename(fPath);
        this.noSuffixName = this.GetNoSuffixName(this.name);
        this.suffix = Path.extname(fPath);
        this.dir = Path.dirname(fPath);
    }

    static fromArray(pathArray: string[]): File {
        return new File(pathArray.join(File.sep));
    }

    static ToUnixPath(path: string): string {
        return Path.normalize(path).replace(/\\{1,}/g, '/');
    }

    static ToUri(path: string): string {
        // Ensure drive letter is handled correctly for file URIs on Windows
        let uriPath = this.ToUnixPath(path);
        if (uriPath.startsWith('/')) {
            uriPath = uriPath.substring(1); // Remove leading slash if present
        }
        // Encode path components, especially spaces and special characters
        uriPath = uriPath.split('/').map(encodeURIComponent).join('/');
        // Add the file scheme and ensure three slashes for absolute paths
        if (!uriPath.startsWith('/')) {
             uriPath = '/' + uriPath;
        }
        return 'file://' + uriPath;
    }

    static ToNoProtocolUri(path: string): string {
        // This might not be standard or necessary, consider using ToUri directly
        let uriPath = this.ToUnixPath(path);
         if (uriPath.startsWith('/')) {
            uriPath = uriPath.substring(1); // Remove leading slash if present
        }
        uriPath = uriPath.split('/').map(encodeURIComponent).join('/');
        if (!uriPath.startsWith('/')) {
             uriPath = '/' + uriPath;
        }
        return uriPath; // Return path suitable for URI without scheme
    }

    static ToLocalPath(path: string): string {
        const res = File.ToUnixPath(path);
        if (File.sep === '\\') {
            return res.replace(/\//g, File.sep);
        }
        return res;
    }

    private static _match(str: string, isInverter: boolean, regList: RegExp[]): boolean {
        let isMatch: boolean = false;
        for (let reg of regList) {
            if (reg.test(str)) {
                isMatch = true;
                break;
            }
        }
        if (isInverter) {
            isMatch = !isMatch;
        }
        return isMatch;
    }

    private static _filter(fList: File[], isInverter: boolean, fileFilter?: RegExp[], dirFilter?: RegExp[]): File[] {
        const res: File[] = [];
        // Filter files
        const files = fList.filter(f => f.IsFile()); // Assuming IsFile exists and works
        if (fileFilter) {
            files.forEach(f => {
                if (this._match(f.name, isInverter, fileFilter)) {
                    res.push(f);
                }
            });
        } else {
            res.push(...files); // Add all files if no filter
        }
        // Filter directories
        const dirs = fList.filter(f => f.IsDir()); // Assuming IsDir exists and works
        if (dirFilter) {
            dirs.forEach(f => {
                if (this._match(f.name, isInverter, dirFilter)) {
                    res.push(f);
                }
            });
        } else {
            res.push(...dirs); // Add all dirs if no filter
        }
        return res;
    }


    static Filter(fList: File[], fileFilter?: RegExp[], dirFilter?: RegExp[]): File[] {
        return this._filter(fList, false, fileFilter, dirFilter);
    }

    static NotMatchFilter(fList: File[], fileFilter?: RegExp[], dirFilter?: RegExp[]): File[] {
        return this._filter(fList, true, fileFilter, dirFilter);
    }

    private GetNoSuffixName(name: string): string {
        const nList = name.split('.'); // Use the passed name argument
        if (nList.length > 1) {
            nList.pop();
            return nList.join('.');
        } else {
            return name;
        }
    }

    private _CopyRetainDir(baseDir: File, file: File) {
        const relativePath = baseDir.ToRelativePath(file.dir);
        if (relativePath) {
            const targetDir = File.fromArray([this.path, relativePath.replace(/\//g, File.sep)]);
            targetDir.CreateDir(true); // Use sync CreateDir here or make this method async
            fs.copyFileSync(file.path, targetDir.path + File.sep + file.name);
        }
    }

    ToRelativePath(abspath: string, hasPrefix: boolean = true): string | undefined {
        if (!Path.isAbsolute(abspath)) {
            // Consider throwing an error or returning a specific value if input is not absolute
            return undefined;
        }
        const rePath = Path.relative(this.path, abspath);
        if (Path.isAbsolute(rePath) || rePath.startsWith('..')) {
            // Path is outside the base directory, return undefined or handle as needed
            return undefined;
        }
        return hasPrefix ? (`.${File.sep}${rePath}`) : rePath;
    }


    // --- Synchronous Methods ---

    CreateDir(recursive: boolean = false): void {
        if (!this.IsDir()) {
             // Use fs.mkdirSync which handles recursive creation directly
            try {
                fs.mkdirSync(this.path, { recursive: recursive });
            } catch (error) {
                // Handle potential errors, e.g., permissions
                console.error(`Failed to create directory ${this.path}:`, error);
                // Optionally re-throw or handle differently
            }
        }
    }


    GetList(fileFilter?: RegExp[], dirFilter?: RegExp[]): File[] {
        let list: File[] = [];
        try {
            fs.readdirSync(this.path).forEach((str: string) => {
                if (str !== '.' && str !== '..') {
                    const f = new File(Path.join(this.path, str)); // Use Path.join
                    // Check if f exists before calling IsDir/IsFile
                    if (f.IsExist()) {
                        if (f.IsDir()) {
                            if (!dirFilter || dirFilter.some(reg => reg.test(f.name))) {
                                list.push(f);
                            }
                        } else { // It's a file
                            if (!fileFilter || fileFilter.some(reg => reg.test(f.name))) {
                                list.push(f);
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error(`Failed to read directory ${this.path}:`, error);
            // Return empty list or re-throw
        }
        return list;
    }


    GetAll(fileFilter?: RegExp[], dirFilter?: RegExp[]): File[] {
        let res: File[] = [];
        let fStack: File[] = [];

        try {
            fStack = this.GetList(fileFilter, dirFilter); // Start with top-level filtered list
        } catch (error) {
             console.error(`Failed initial GetList in GetAll for ${this.path}:`, error);
             return []; // Return empty if initial read fails
        }

        const processedDirs = new Set<string>(); // Avoid infinite loops with symlinks
        processedDirs.add(this.path);

        while (fStack.length > 0) {
            const f = fStack.pop()!; // Non-null assertion as we check length > 0
            res.push(f); // Add the file/dir itself

            if (f.IsDir() && !processedDirs.has(f.path)) {
                 processedDirs.add(f.path);
                try {
                    // Get unfiltered list from subdirectory and filter later if needed
                    const subList = f.GetList(fileFilter, dirFilter);
                    fStack.push(...subList); // Add sub-items to the stack
                } catch (error) {
                     console.error(`Failed GetList in GetAll for subdirectory ${f.path}:`, error);
                     // Continue with other items
                }
            }
        }
        // The filtering is now done within GetList calls, so no need for File.Filter here
        return res;
    }


    CopyRetainDir(baseDir: File, file: File) {
        this._CopyRetainDir(baseDir, file);
    }

    CopyFile(file: File) {
        try {
            fs.copyFileSync(file.path, Path.join(this.path, file.name)); // Use Path.join
        } catch (error) {
             console.error(`Failed to copy file ${file.path} to ${this.path}:`, error);
        }
    }

    CopyList(dir: File, fileFilter?: RegExp[], dirFilter?: RegExp[]) {
        try {
            let fList = dir.GetList(fileFilter, dirFilter);
            fList.forEach(f => {
                if (f.IsFile()) {
                    this.CopyRetainDir(dir, f);
                }
            });
        } catch (error) {
             console.error(`Failed CopyList from ${dir.path} to ${this.path}:`, error);
        }
    }

    CopyAll(dir: File, fileFilter?: RegExp[], dirFilter?: RegExp[]) {
         try {
            let fList = dir.GetAll(fileFilter, dirFilter);
            fList.forEach(f => {
                // Ensure we only copy files, GetAll might return directories too depending on filter
                if (f.IsFile()) {
                    this.CopyRetainDir(dir, f);
                }
            });
         } catch (error) {
              console.error(`Failed CopyAll from ${dir.path} to ${this.path}:`, error);
         }
    }


    Read(encoding: BufferEncoding = 'utf8'): string { // Default encoding
        try {
            return fs.readFileSync(this.path, { encoding: encoding });
        } catch (error) {
             console.error(`Failed to read file ${this.path}:`, error);
             return ''; // Return empty string or throw error
        }
    }

    Write(str: string, options?: fs.WriteFileOptions) {
         try {
            fs.writeFileSync(this.path, str, options);
         } catch (error) {
              console.error(`Failed to write file ${this.path}:`, error);
         }
    }

    IsExist(): boolean {
        return fs.existsSync(this.path);
    }

    IsFile(): boolean {
        try {
            return fs.lstatSync(this.path).isFile();
        } catch {
            return false; // If lstatSync fails (e.g., file doesn't exist), it's not a file
        }
    }

    IsDir(): boolean {
         try {
            return fs.lstatSync(this.path).isDirectory();
         } catch {
             return false; // If lstatSync fails, it's not a directory
         }
    }

    getHash(hashName: string = 'md5'): string { // Default hash algorithm
        try {
            const hash = crypto.createHash(hashName);
            const fileBuffer = fs.readFileSync(this.path); // Read as buffer for hashing
            hash.update(fileBuffer);
            return hash.digest('hex');
        } catch (error) {
             console.error(`Failed to get hash for file ${this.path}:`, error);
             return ''; // Return empty string or handle error
        }
    }

    getSize(): number {
        try {
            return fs.statSync(this.path).size;
        } catch (error) {
             console.error(`Failed to get size for file ${this.path}:`, error);
             return 0; // Return 0 or handle error
        }
    }

    ToUri(): string {
        return File.ToUri(this.path); // Use static method
    }

    ToNoProtocolUri(): string {
        return File.ToNoProtocolUri(this.path); // Use static method
    }

    // --- Asynchronous Methods ---

    async CreateDirAsync(recursive: boolean = false): Promise<void> {
        // Check existence first to potentially avoid errors if it already exists
        if (!(await this.IsDirAsync())) {
             try {
                await fs.promises.mkdir(this.path, { recursive: recursive });
             } catch (error) {
                  console.error(`Failed to create directory async ${this.path}:`, error);
                  // Optionally re-throw
             }
        }
    }

    async GetListAsync(fileFilter?: RegExp[], dirFilter?: RegExp[]): Promise<File[]> {
        let list: File[] = [];
        try {
            const dirents = await fs.promises.readdir(this.path, { withFileTypes: true });
            for (const dirent of dirents) {
                if (dirent.name !== '.' && dirent.name !== '..') {
                    const f = new File(Path.join(this.path, dirent.name)); // Use Path.join
                    // No need to check existence async, readdir ensures it exists
                    if (dirent.isDirectory()) {
                        if (!dirFilter || dirFilter.some(reg => reg.test(f.name))) {
                            list.push(f);
                        }
                    } else if (dirent.isFile()) {
                        if (!fileFilter || fileFilter.some(reg => reg.test(f.name))) {
                            list.push(f);
                        }
                    }
                }
            }
        } catch (error) {
             console.error(`Failed to read directory async ${this.path}:`, error);
             // Return empty list or re-throw
        }
        return list;
    }


    async ReadAsync(encoding: BufferEncoding = 'utf8'): Promise<string> {
        try {
            return await fs.promises.readFile(this.path, { encoding: encoding });
        } catch (error) {
             console.error(`Failed to read file async ${this.path}:`, error);
             return ''; // Return empty string or throw error
        }
    }

    async WriteAsync(str: string, options?: fs.WriteFileOptions): Promise<void> {
         try {
            await fs.promises.writeFile(this.path, str, options);
         } catch (error) {
              console.error(`Failed to write file async ${this.path}:`, error);
              // Optionally re-throw
         }
    }

    async IsExistAsync(): Promise<boolean> {
        try {
            await fs.promises.access(this.path);
            return true;
        } catch {
            return false;
        }
    }

    async IsFileAsync(): Promise<boolean> {
        try {
            const stats = await fs.promises.lstat(this.path);
            return stats.isFile();
        } catch {
            return false;
        }
    }

    async IsDirAsync(): Promise<boolean> {
        try {
            const stats = await fs.promises.lstat(this.path);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    async getHashAsync(hashName: string = 'md5'): Promise<string> {
        try {
            const hash = crypto.createHash(hashName);
            const fileBuffer = await fs.promises.readFile(this.path); // Read async
            hash.update(fileBuffer);
            return hash.digest('hex');
        } catch (error) {
             console.error(`Failed to get hash async for file ${this.path}:`, error);
             return ''; // Return empty string or handle error
        }
    }

    async getSizeAsync(): Promise<number> {
        try {
            const stats = await fs.promises.stat(this.path); // Use stat for size
            return stats.size;
        } catch (error) {
             console.error(`Failed to get size async for file ${this.path}:`, error);
             return 0; // Return 0 or handle error
        }
    }
}