import { strict as assert } from 'assert';
import { buildTreeItemId, findRevealPath, sortProjects } from '../projectExplorer/treeState';

describe('treeState', () => {
    it('builds stable IDs from project path and labels', () => {
        assert.equal(
            buildTreeItemId('group', {
                projectPath: 'D:/fw/demo.uvprojx',
                targetName: 'Debug',
                groupName: 'Drivers'
            }),
            'group:d:/fw/demo.uvprojx:debug:drivers'
        );
    });

    it('keeps legacy order when sort mode is legacy', () => {
        const result = sortProjects(
            [
                { label: 'B', path: 'D:/b.uvprojx' },
                { label: 'A', path: 'D:/a.uvprojx' }
            ],
            'legacy'
        );

        assert.deepEqual(result.map((item: { label: string }) => item.label), ['B', 'A']);
    });

    it('sorts by normalized path when requested', () => {
        const result = sortProjects(
            [
                { label: 'Demo', path: 'D:/z/demo.uvprojx' },
                { label: 'Demo', path: 'D:/a/demo.uvprojx' }
            ],
            'path'
        );

        assert.deepEqual(result.map((item: { path: string }) => item.path), ['D:/a/demo.uvprojx', 'D:/z/demo.uvprojx']);
    });

    it('finds the visible tree path for a current file', () => {
        const match = findRevealPath('D:/fw/Core/Src/main.c', [
            {
                projectPath: 'D:/fw/demo.uvprojx',
                targetName: 'Debug',
                groupName: 'Core',
                filePath: 'D:/fw/Core/Src/main.c'
            }
        ]);

        assert.equal(match?.groupName, 'Core');
    });
});
