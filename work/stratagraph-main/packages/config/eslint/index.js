import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.opencode/**',
      '**/.output/**',
      '**/.vercel/**',
      '**/.turbo/**',
      '**/.venv/**',
      'apps/wiki-site/site/**',
      'apps/wiki-site/docs/**',
      '**/*.gen.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
    },
  },
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Prevent frontend packages from importing @repo/db (causes Prisma client bundling issues)
  // Frontend code should use @repo/types for client-safe enum values and types
  {
    files: [
      'apps/web/src/**/*.ts',
      'apps/web/src/**/*.tsx',
      'apps/web/app/**/*.ts',
      'apps/web/app/**/*.tsx',
      'packages/ui/src/**/*.ts',
      'packages/ui/src/**/*.tsx',
    ],
    ignores: [
      // API routes run on the server and can import @repo/db
      'apps/web/src/routes/api/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@repo/db',
              message:
                'Do not import @repo/db in frontend code. Use @repo/types for client-safe enum values and types.',
            },
            {
              name: '@repo/db/types',
              message:
                'Do not import @repo/db/types in frontend code. Use @repo/types for client-safe enum values and types.',
            },
          ],
          patterns: [
            {
              group: ['@repo/db/*'],
              message:
                'Do not import from @repo/db/* in frontend code. Use @repo/types for client-safe enum values and types.',
            },
          ],
        },
      ],
    },
  },
  // Extraction-readiness for the future @meetbean/slate-markdown-diff package.
  // The diff library (diff-* lib files + DiffKit + DiffLeaf) must compose only
  // with generic Slate / Plate / npm primitives so it can be lifted into a
  // standalone npm package later (MEE-1771).
  {
    files: [
      'packages/editor/src/lib/diff-*',
      'packages/editor/src/kits/internal/diff-kit.tsx',
      'packages/editor/src/components/nodes/diff-leaf.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@repo/*'],
              message:
                'Diff library files are extraction-targets for a future npm package and must not depend on workspace packages. Inline the helper or pass it via callback injection.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier
);
