export type ProjectSortOrder = 'legacy' | 'name' | 'path';

export interface ProjectListItem {
    label: string;
    path: string;
}

export interface RevealEntry {
    projectPath: string;
    targetName: string;
    groupName: string;
    filePath: string;
}

function normalizeValue(value: string): string {
    return value.replace(/\\/g, '/').toLowerCase();
}

export function buildTreeItemId(kind: string, input: Record<string, string>): string {
    return [kind, ...Object.values(input).map(normalizeValue)].join(':');
}

export function sortProjects<T extends ProjectListItem>(items: T[], mode: ProjectSortOrder): T[] {
    if (mode === 'legacy') {
        return items;
    }

    return [...items].sort((left, right) => {
        const primaryLeft = mode === 'name' ? left.label : left.path;
        const primaryRight = mode === 'name' ? right.label : right.path;
        const primary = primaryLeft.localeCompare(primaryRight, undefined, { sensitivity: 'base' });
        if (primary !== 0) {
            return primary;
        }

        const tieBreakLeft = mode === 'name' ? left.path : left.label;
        const tieBreakRight = mode === 'name' ? right.path : right.label;
        return tieBreakLeft.localeCompare(tieBreakRight, undefined, { sensitivity: 'base' });
    });
}

export function findRevealPath<T extends RevealEntry>(currentFilePath: string, entries: T[]): T | undefined {
    const normalizedCurrent = normalizeValue(currentFilePath);
    return entries.find(entry => normalizeValue(entry.filePath) === normalizedCurrent);
}
