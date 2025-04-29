import { eslintConfigs } from '@aligent/ts-code-standards';

export default [
    ...eslintConfigs.base,
    { ignores: ['**/*.{js,mjs}', '**/generated', '**/dist'] },
];
