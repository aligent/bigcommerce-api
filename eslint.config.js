import { eslintConfigs } from '@aligent/ts-code-standards';

export default [
    ...eslintConfigs.core,
    { ignores: ['**/*.{js,mjs}', '**/generated', '**/lib'] },
];
