import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as path from 'path';

function readPackageJson(): any {
    return JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8')
    );
}

function readReadme(): string {
    return fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
}

describe('marketplace metadata', () => {
    it('keeps the extension id stable while making the fork identity explicit', () => {
        const manifest = readPackageJson();

        assert.equal(manifest.name, 'keil-assistant-new');
        assert.equal(manifest.displayName, 'Keil Assistant Community Fork');
        assert.match(manifest.description, /community-maintained fork/i);
        assert.equal(manifest.contributes.configuration[0].title, 'Keil Assistant Community Fork');
    });

    it('makes the fork relationship and differentiators obvious at the top of the README', () => {
        const readme = readReadme();

        assert.match(readme, /^# Keil Assistant Community Fork/m);
        assert.match(readme, /community-maintained fork of the original Keil Assistant/i);
        assert.match(readme, /## What Is Different In This Fork\?/i);
    });
});
