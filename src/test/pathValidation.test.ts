import { strict as assert } from 'assert';
import { validateExecutionPaths } from '../project/pathValidation';

describe('validateExecutionPaths', () => {
    it('reports the exact missing path kind', () => {
        const result = validateExecutionPaths({
            builderExe: 'C:/missing/Uv4Caller.exe',
            uv4Path: 'C:/Keil_v5/UV4/UV4.exe',
            projectFile: 'D:/fw/demo.uvprojx',
            projectDir: 'D:/fw'
        }, () => false);

        assert.equal(result.ok, false);
        assert.equal(result.errors[0].kind, 'builderExe');
    });

    it('reports missing project directory before task execution', () => {
        const result = validateExecutionPaths({
            builderExe: 'C:/tools/Uv4Caller.exe',
            uv4Path: 'C:/Keil_v5/UV4/UV4.exe',
            projectFile: 'D:/fw/demo.uvprojx',
            projectDir: 'D:/fw'
        }, candidate => candidate !== 'D:/fw');

        assert.equal(result.ok, false);
        assert.equal(result.errors[0].kind, 'projectDir');
    });
});
