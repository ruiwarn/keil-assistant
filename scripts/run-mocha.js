const glob = require('glob');
const Mocha = require('mocha');

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    if (index === -1 || index + 1 >= process.argv.length) {
        return undefined;
    }
    return process.argv[index + 1];
}

const mocha = new Mocha({
    grep: getArgValue('--grep')
});

const files = glob.sync('dist/**/*.test.js').sort();
files.forEach(file => mocha.addFile(file));

mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;
});
