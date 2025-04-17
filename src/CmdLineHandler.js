"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmdLineHandler = void 0;
class CmdLineHandler {
    constructor() {
        // Intentionally empty
    }
    /**
     * powershell:  & '@param callerFile' 'arg1' 'arg2'
     *
     * cmd:         ""@param callerFile" "arg1" "arg2""
    */
    static getCommandLine(callerFile, args, isPowershell, noQuote = false) {
        const quote = isPowershell ? "'" : '"';
        const callerHeader = isPowershell ? '& ' : '';
        const cmdPrefixSuffix = isPowershell ? '' : '"';
        const commandLine = cmdPrefixSuffix + callerHeader
            + this.quoteString(callerFile, quote) + ' '
            + args.map((arg) => {
                return noQuote ? arg : this.quoteString(arg, quote);
            }).join(' ')
            + cmdPrefixSuffix;
        return commandLine;
    }
    /**
     * input: ""a b.exe" -a -b -c"
     *
     * output: "a b.exe" -a -b -c
    */
    static DeleteCmdPrefix(cmdLine) {
        return cmdLine.replace(/^"|"$/g, '');
    }
    static quoteString(str, quote) {
        return (str.includes(' ') && !str.includes(quote)) ? (quote + str + quote) : str;
    }
}
exports.CmdLineHandler = CmdLineHandler;
//# sourceMappingURL=CmdLineHandler.js.map