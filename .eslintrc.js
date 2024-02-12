module.exports = {
    root: true,
    extends: ['standard', 'alloy', 'alloy/typescript'],
    parserOptions: {
        project: './tsconfig-eslint.json'
    },
    rules: {
        indent: [
            'error',
            4,
            {
                SwitchCase: 1
            }
        ],
        quotes: ['error', 'single'],
        semi: 0,
        radix: ['error', 'as-needed'],
        'max-params': ['error', 5],
        'func-name-matching': [0, 'always'],
        'no-param-reassign': [0],
        'no-lone-blocks': [0],
        'space-before-function-paren': [0],
        '@typescript-eslint/no-this-alias': ['off'],
        'no-return-assign': 0
    },
    overrides: [
        {
            extends: ['plugin:@typescript-eslint/disable-type-checked'],
            files: ['*.js', '*.mjs']
        },
        {
            extends: ['plugin:@typescript-eslint/recommended-requiring-type-checking'],
            files: ['*.ts'],
            rules: {
                'no-unused-vars': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-unused-vars': ['error'],
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/unbound-method': 'off',
                '@typescript-eslint/no-unsafe-return': 'off',
                '@typescript-eslint/no-unsafe-argument': 'off',
                '@typescript-eslint/no-unsafe-call': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-floating-promises': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/explicit-member-accessibility': 'off'
            }
        }
    ]
};
