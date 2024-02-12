import type { RollupOptions } from 'rollup';
import { ROOT_DIR } from './vars';
import typescript from '@rollup/plugin-typescript';
import { fireRollup, getDefaultRollupPlugins } from './rp';
import { dts } from 'rollup-plugin-dts';
import { compilerMpResource } from './mp';

const getCoreBuildOptions = (): RollupOptions[] => {
    return [
        {
            input: ROOT_DIR + '/packages/core/src/index.ts',
            plugins: [
                ...getDefaultRollupPlugins(),
                typescript({
                    tsconfig: ROOT_DIR + '/packages/core/tsconfig.json',
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    typescript: require('typescript')
                })
            ],
            output: [
                {
                    format: 'cjs',
                    file: ROOT_DIR + '/packages/core/dist/cjs/index.js'
                },
                {
                    format: 'esm',
                    file: ROOT_DIR + '/packages/core/dist/esm/index.js'
                }
            ]
        },
        {
            input: ROOT_DIR + '/packages/core/src/index.ts',
            plugins: [dts()],
            output: [
                {
                    format: 'cjs',
                    file: ROOT_DIR + '/packages/core/dist/cjs/index.d.ts'
                },
                {
                    format: 'esm',
                    file: ROOT_DIR + '/packages/core/dist/esm/index.d.ts'
                }
            ]
        }
    ];
};

const getMpWxBuildOptions = (): [RollupOptions, () => Promise<any>] => {
    return [
        {
            input: {
                'regular/index': ROOT_DIR + '/packages/mp-wx/src/regular/index.ts'
            },
            plugins: [
                ...getDefaultRollupPlugins(),
                typescript({
                    tsconfig: ROOT_DIR + '/packages/mp-wx/tsconfig.json',
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    typescript: require('typescript')
                })
            ],
            output: [
                {
                    format: 'cjs',
                    dir: ROOT_DIR + '/packages/mp-wx/dist/cjs',
                    chunkFileNames: '[name].js'
                },
                {
                    format: 'esm',
                    dir: ROOT_DIR + '/packages/mp-wx/dist/esm',
                    chunkFileNames: '[name].js'
                }
            ]
        },
        () => {
            return Promise.all([
                compilerMpResource(ROOT_DIR + '/packages/mp-wx/src', ROOT_DIR + '/packages/mp-wx/dist/cjs'),
                compilerMpResource(ROOT_DIR + '/packages/mp-wx/src', ROOT_DIR + '/packages/mp-wx/dist/esm')
            ]);
        }
    ];
};

export const buildPackage = (name: 'core' | 'mp-wx' | 'all') => {
    if (name === 'core') {
        return fireRollup(getCoreBuildOptions());
    }
    if (name === 'mp-wx') {
        return fireRollup([getMpWxBuildOptions()]);
    }
    return Promise.all(
        ['core', 'mp-wx'].map((name) => {
            return buildPackage(name as any);
        })
    );
};
