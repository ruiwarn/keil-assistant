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

function readReadmeEn(): string {
    return fs.readFileSync(path.resolve(__dirname, '../../../README_EN.md'), 'utf8');
}

describe('marketplace metadata', () => {
    it('keeps the extension id stable while making the fork identity explicit', () => {
        const manifest = readPackageJson();

        assert.equal(manifest.name, 'keil-assistant-new');
        assert.equal(manifest.displayName, 'Keil Assistant Community Fork');
        assert.match(manifest.description, /community-maintained fork/i);
        assert.equal(manifest.homepage, 'https://github.com/ruiwarn/keil-assistant');
        assert.equal(manifest.repository.url, 'https://github.com/ruiwarn/keil-assistant');
        assert.equal(manifest.bugs.url, 'https://github.com/ruiwarn/keil-assistant/issues');
        assert.equal(manifest.contributes.configuration[0].title, 'Keil Assistant Community Fork');
    });

    it('makes the independent continuation and differentiators obvious at the top of the README', () => {
        const readme = readReadme();

        assert.match(readme, /^# Keil Assistant Community Fork/m);
        assert.match(readme, /community-maintained continuation of the original Keil Assistant/i);
        assert.match(readme, /## What Is Different In This Edition\?/i);
        assert.match(readme, /## Project Origin/i);
    });

    it('does not reference marketplace-risk screenshots in the public readmes', () => {
        const screenshotPatterns = [
            './images/copilot-tools.png',
            './images/help.jpg',
            './res/preview/preview.png',
            './res/preview/setting.png'
        ];
        const readmes = [readReadme(), readReadmeEn()];

        for (const readme of readmes) {
            for (const screenshotPattern of screenshotPatterns) {
                assert.doesNotMatch(readme, new RegExp(screenshotPattern.replace('.', '\\.')));
            }
        }
    });
});
