import type { RollupOptions, OutputOptions } from 'rollup';
import { rollup } from 'rollup';
import NodeResolve from '@rollup/plugin-node-resolve';
import { VERSION } from './vars';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const RollupReplace = require('@rollup/plugin-replace');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const commonjs = require('@rollup/plugin-commonjs');

export const getDefaultRollupPlugins = () => [
    NodeResolve({
        extensions: ['.jsx', '.js', '.ts']
    }),
    commonjs(),
    RollupReplace({
        delimiters: ['', ''],
        values: {
            VERSION: VERSION
        },
        preventAssignment: true
    })
];

export const fireRollup = (optionsList: Array<RollupOptions | [RollupOptions, () => any]>): Promise<void> => {
    return Promise.all(
        optionsList.map((val) => {
            const options = Array.isArray(val) ? val[0] : val;
            const done = Array.isArray(val) ? val[1] : () => {};
            return rollup(options)
                .then((res) => {
                    return Promise.all(
                        [res].concat(
                            (options.output as OutputOptions[]).map((item: OutputOptions) => {
                                return res.write(item);
                            }) as any
                        )
                    );
                })
                .then(([res]) => {
                    res.close();
                })
                .then(() => {
                    return done();
                });
        })
    ).then(() => {});
};
