import { eslintConfigs } from '@aligent/ts-code-standards';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    ...eslintConfigs.base,
    {
        ignores: ['**/*.{js,mjs}', '**/generated', '**/.tmp-generate', '**/dist'],
    },
]);
