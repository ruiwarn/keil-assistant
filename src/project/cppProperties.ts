export interface CppConfiguration {
    name: string;
    includePath?: string[];
    defines?: string[];
    [key: string]: unknown;
}

export interface CppPropertiesRoot {
    configurations: CppConfiguration[];
    version: number;
    [key: string]: unknown;
}

function normalizeRoot(current: unknown): CppPropertiesRoot {
    const root = current && typeof current === 'object' ? { ...(current as Record<string, unknown>) } : {};
    const configurations = Array.isArray(root.configurations) ? [...root.configurations as CppConfiguration[]] : [];

    return {
        ...root,
        configurations,
        version: typeof root.version === 'number' ? root.version : 4
    };
}

export function mergeCppProperties(
    current: unknown,
    configName: string,
    includePath: string[],
    defines: string[],
    legacyName?: string
): CppPropertiesRoot {
    const root = normalizeRoot(current);
    const configurations = root.configurations;

    let index = configurations.findIndex(conf => conf?.name === configName);
    const legacyIndex = legacyName ? configurations.findIndex(conf => conf?.name === legacyName) : -1;

    if (index === -1 && legacyIndex !== -1) {
        index = legacyIndex;
    } else if (index !== -1 && legacyIndex !== -1 && index !== legacyIndex) {
        configurations.splice(legacyIndex, 1);
        if (legacyIndex < index) {
            index--;
        }
    }

    const next: CppConfiguration = index === -1
        ? { name: configName }
        : { ...configurations[index], name: configName };

    next.includePath = includePath;
    next.defines = defines;

    if (index === -1) {
        configurations.push(next);
    } else {
        configurations[index] = next;
    }

    return {
        ...root,
        configurations
    };
}
