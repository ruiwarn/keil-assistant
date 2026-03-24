export type ValidationPathKind = 'builderExe' | 'uv4Path' | 'projectFile' | 'projectDir';

export interface ValidationError {
    kind: ValidationPathKind;
    path: string;
}

export interface ExecutionPathInput {
    builderExe: string;
    uv4Path: string;
    projectFile: string;
    projectDir: string;
}

export interface ValidationResult {
    ok: boolean;
    errors: ValidationError[];
}

export function validateExecutionPaths(
    input: ExecutionPathInput,
    exists: (path: string) => boolean
): ValidationResult {
    const errors: ValidationError[] = [];

    if (!exists(input.builderExe)) {
        errors.push({ kind: 'builderExe', path: input.builderExe });
    }
    if (!exists(input.uv4Path)) {
        errors.push({ kind: 'uv4Path', path: input.uv4Path });
    }
    if (!exists(input.projectFile)) {
        errors.push({ kind: 'projectFile', path: input.projectFile });
    }
    if (!exists(input.projectDir)) {
        errors.push({ kind: 'projectDir', path: input.projectDir });
    }

    return {
        ok: errors.length === 0,
        errors
    };
}

export function formatPathValidationErrors(errors: ValidationError[]): string {
    const labels: Record<ValidationPathKind, string> = {
        builderExe: 'Uv4Caller.exe 路径不存在',
        uv4Path: 'UV4.exe 路径不存在',
        projectFile: 'Keil 工程文件不存在',
        projectDir: 'Keil 工程目录不存在'
    };

    return errors.map(error => `${labels[error.kind]}: ${error.path}`).join('\n');
}
