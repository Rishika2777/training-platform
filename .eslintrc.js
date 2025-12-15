/**
 * ESLint Configuration
 * For AngularJS project with unused variable/function detection
 */
/* eslint-env node */
module.exports = {
    env: {
        browser: true,
        node: true,
        es2021: true,
        jquery: true
    },
    extends: ['eslint:recommended'],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    globals: {
        angular: 'readonly',
        $: 'readonly'
    },
    rules: {
        // Unused variables and functions
        'no-unused-vars': [
            'error',
            {
                vars: 'all',
                args: 'after-used',
                ignoreRestSiblings: false,
                varsIgnorePattern: '^_',
                argsIgnorePattern: '^_'
            }
        ],
        'no-unused-expressions': 'error',

        // Code quality
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-debugger': 'error',
        'no-alert': 'warn',
        'no-var': 'warn',
        'prefer-const': 'warn',

        // Best practices
        eqeqeq: ['error', 'always'],
        curly: ['error', 'all'],
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',

        // Style
        semi: ['error', 'always'],
        quotes: ['error', 'single', { avoidEscape: true }],
        indent: ['error', 4, { SwitchCase: 1 }],
        'comma-dangle': ['error', 'never'],
        'no-trailing-spaces': 'error',
        'eol-last': ['error', 'always'],

        // AngularJS specific patterns
        'no-undef': 'error',
        'no-redeclare': 'error'
    },
    overrides: [
        {
            // Files that use AngularJS dependency injection
            files: ['app/**/*.js'],
            rules: {
                // Allow unused vars in function parameters for AngularJS DI
                'no-unused-vars': [
                    'error',
                    {
                        vars: 'all',
                        args: 'none', // AngularJS DI uses all parameters
                        ignoreRestSiblings: false,
                        varsIgnorePattern: '^_',
                        argsIgnorePattern: '^_'
                    }
                ]
            }
        },
        {
            // Node.js scripts
            files: ['scripts/**/*.js', '.eslintrc.js'],
            env: {
                node: true,
                browser: false
            },
            globals: {
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                console: 'readonly'
            },
            rules: {
                'no-console': 'off', // Allow console in Node.js scripts
                'no-unused-vars': [
                    'error',
                    {
                        vars: 'all',
                        args: 'after-used',
                        ignoreRestSiblings: false,
                        varsIgnorePattern: '^_',
                        argsIgnorePattern: '^_'
                    }
                ]
            }
        }
    ]
};
