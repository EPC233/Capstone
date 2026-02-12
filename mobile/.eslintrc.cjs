module.exports = {
    root: true,
    env: { 
        es2020: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier', // Must be last to override other configs
    ],
    ignorePatterns: ['node_modules', '.expo', 'dist', 'build', '.eslintrc.cjs'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
        project: './tsconfig.json',
    },
    overrides: [
        {
            // For .js files, don't use TypeScript parser project
            files: ['**/*.js', '**/*.jsx'],
            parserOptions: {
                project: null,
            },
        },
        {
            // For config files, don't use TypeScript parser project
            files: ['*.config.ts', '*.config.js', '*.config.cjs'],
            parserOptions: {
                project: null,
            },
        },
    ],
    settings: { 
        react: { 
            version: 'detect' 
        } 
    },
    plugins: [
        'react',
        'react-hooks',
        'unused-imports',
        '@typescript-eslint',
    ],
    rules: {
        'react/prop-types': 'off', // Using TypeScript for type checking
        'react/jsx-uses-vars': 'error',
        'react/jsx-uses-react': 'off',
        // TypeScript-specific rules
        '@typescript-eslint/no-unused-vars': 'off', // Use unused-imports instead
        '@typescript-eslint/no-explicit-any': 'warn', // Warn on 'any' type
        '@typescript-eslint/explicit-module-boundary-types': 'off', // Allow inferred return types
        // Check for unused variables and imports
        'no-unused-vars': 'off', // Turn off base rule as it conflicts with unused-imports
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
            'error',
            {
                vars: 'all',
                args: 'after-used',
                ignoreRestSiblings: true,
                varsIgnorePattern: '^_', // Allow variables starting with _
                argsIgnorePattern: '^_', // Allow function parameters starting with _
            },
        ],
    },
};

