import type { RollupOptions } from 'rollup';
import { ROOT_DIR } from './vars';
import typescript from '@rollup/plugin-typescript';
import { fireRollup, getDefaultRollupPlugins } from './rp';
import { dts } from 'rollup-plugin-dts';
import { compilerMpResource } from './mp';
import { copyPromise } from './fs';
import * as rimraf from 'rimraf';

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
                },
                {
                    format: 'umd',
                    file: ROOT_DIR + '/packages/core/dist/umd/index.js',
                    name: 'CrossVirtualList'
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
                },
                {
                    format: 'umd',
                    file: ROOT_DIR + '/packages/core/dist/umd/index.d.ts',
                    name: 'CrossVirtualList'
                }
            ]
        }
    ];
};

const getTypesBuildOptions = (): RollupOptions => {
    return {
        input: ROOT_DIR + '/packages/types/src/index.ts',
        plugins: [dts()],
        output: [
            {
                format: 'esm',
                file: ROOT_DIR + '/packages/types/dist/index.d.ts'
            }
        ]
    };
};

const getMpWxBuildOptions = (): Array<[RollupOptions, () => Promise<any>]> => {
    return [
        [
            {
                external: [/@cross-virtual-list\//, 'typescript-mp-component'],
                input: {
                    'components/regular/index': ROOT_DIR + '/packages/mp-wx/src/components/regular/index.ts',
                    'components/dynamic/index': ROOT_DIR + '/packages/mp-wx/src/components/dynamic/index.ts'
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
                        chunkFileNames: '[name].js',
                        manualChunks: (id) => {
                            if (id.includes('node_modules')) {
                                return 'vender';
                            }
                            if (!id.includes('components')) {
                                return 'common';
                            }
                        }
                    },
                    {
                        format: 'esm',
                        dir: ROOT_DIR + '/packages/mp-wx/dist/esm',
                        chunkFileNames: '[name].js',
                        manualChunks: (id) => {
                            if (id.includes('node_modules')) {
                                return 'vender';
                            }
                            if (!id.includes('components')) {
                                return 'common';
                            }
                        }
                    }
                ]
            },
            () => {
                return Promise.all([
                    compilerMpResource(ROOT_DIR + '/packages/mp-wx/src', ROOT_DIR + '/packages/mp-wx/dist/cjs'),
                    compilerMpResource(ROOT_DIR + '/packages/mp-wx/src', ROOT_DIR + '/packages/mp-wx/dist/esm')
                ]);
            }
        ],
        [
            {
                input: {
                    'components/regular/index': ROOT_DIR + '/packages/mp-wx/src/components/regular/index.ts',
                    'components/dynamic/index': ROOT_DIR + '/packages/mp-wx/src/components/dynamic/index.ts'
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
                        format: 'esm',
                        dir: ROOT_DIR + '/packages/mp-wx/dist/esm-full',
                        chunkFileNames: '[name].js',
                        manualChunks: (id) => {
                            if (id.includes('node_modules')) {
                                return 'vender';
                            }
                            if (!id.includes('components')) {
                                return 'common';
                            }
                        }
                    }
                ]
            },
            () => {
                return Promise.all([
                    compilerMpResource(ROOT_DIR + '/packages/mp-wx/src', ROOT_DIR + '/packages/mp-wx/dist/esm-full')
                ]).then(() => {
                    rimraf.sync(ROOT_DIR + '/packages/mp-wx/examples/vl-dist');
                    return copyPromise(
                        ROOT_DIR + '/packages/mp-wx/dist/esm-full/**/*.*',
                        ROOT_DIR + '/packages/mp-wx/examples/vl-dist'
                    );
                });
            }
        ]
    ];
};

export const buildPackage = (name: 'types' | 'core' | 'mp-wx' | 'all') => {
    if (name === 'types') {
        return fireRollup([getTypesBuildOptions()]);
    }
    if (name === 'core') {
        return fireRollup(getCoreBuildOptions());
    }
    if (name === 'mp-wx') {
        return fireRollup(getMpWxBuildOptions());
    }
    return Promise.all(
        ['types', 'core', 'mp-wx'].map((name) => {
            return buildPackage(name as any);
        })
    );
};
