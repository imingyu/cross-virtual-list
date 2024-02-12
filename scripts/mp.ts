import { compileFile } from './sass';
import { getFiles, copyPromise } from './fs';

export const compilerMpResource = (src: string, dist: string) => {
    return Promise.all([
        copyPromise(`${src}/**/*.png`, dist),
        copyPromise(`${src}/**/*.jpg`, dist),
        copyPromise(`${src}/**/*.jpeg`, dist),
        copyPromise(`${src}/**/*.gif`, dist),
        copyPromise(`${src}/**/*.wxs`, dist),
        copyPromise(`${src}/**/*.wxml`, dist),
        copyPromise(`${src}/**/*.wxss`, dist),
        copyPromise(`${src}/**/*.json`, dist),
        ...getFiles(src, true).reduce((sum: Array<Promise<void>>, fileName) => {
            if (fileName.endsWith('.scss')) {
                sum.push(compileFile(fileName, dist + fileName.substring(src.length).replace('.scss', '.wxss')));
            }
            return sum;
        }, [])
    ]);
};
