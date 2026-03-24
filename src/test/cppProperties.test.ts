import { strict as assert } from 'assert';
import { mergeCppProperties } from '../project/cppProperties';

describe('mergeCppProperties', () => {
    it('preserves user-owned fields on the target configuration', () => {
        const current = {
            configurations: [
                {
                    name: 'Demo_Debug',
                    compilerPath: 'C:/Keil_v5/ARM/ARMCLANG/bin/armclang.exe',
                    includePath: ['legacy/include'],
                    defines: ['OLD'],
                    browse: { path: ['kept/by/user'] }
                }
            ],
            version: 4
        };

        const merged = mergeCppProperties(current, 'Demo_Debug', ['new/include', '${default}'], ['NEW']);

        assert.equal(merged.configurations[0].compilerPath, current.configurations[0].compilerPath);
        assert.deepEqual(merged.configurations[0].browse, current.configurations[0].browse);
        assert.deepEqual(merged.configurations[0].includePath, ['new/include', '${default}']);
        assert.deepEqual(merged.configurations[0].defines, ['NEW']);
    });

    it('migrates a legacy target-name config without dropping user fields', () => {
        const current = {
            configurations: [
                {
                    name: 'Debug',
                    compilerPath: 'C:/Keil_v5/ARM/ARMCC/bin/armcc.exe',
                    forcedInclude: ['kept.h']
                }
            ],
            version: 4
        };

        const merged = mergeCppProperties(current, 'Demo_Debug', ['inc', '${default}'], ['DEF'], 'Debug');

        assert.equal(merged.configurations[0].name, 'Demo_Debug');
        assert.deepEqual(merged.configurations[0].forcedInclude, ['kept.h']);
        assert.deepEqual(merged.configurations[0].includePath, ['inc', '${default}']);
        assert.deepEqual(merged.configurations[0].defines, ['DEF']);
    });
});
