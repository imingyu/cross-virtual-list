import { readFile, writeFile } from './fs';
import { ROOT_DIR } from './vars';
import { oneByOne, runCommand } from './other';

const version = JSON.parse(readFile(ROOT_DIR + '/package.json').trim()).version;

oneByOne(
    [ROOT_DIR + '/packages/types', ROOT_DIR + '/packages/core', ROOT_DIR + '/packages/mp-wx'].map((dir) => {
        return () => {
            const name = dir + '/package.json';
            const json = JSON.parse(readFile(name).trim());
            json.version = version;
            writeFile(name, JSON.stringify(json, null, 4));
            return runCommand(`cd ${dir} && pnpm publish --no-git-checks`);
        };
    }),
    true
);
