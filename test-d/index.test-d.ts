import { Management } from '../src/index.js';

// Exporting test requirements from here, in case it's useful
// to replace them for all tests at some point
export type Client = Management.Client;
export { expectError, expectType } from 'tsd';

// tsd operates at the compile level and will check all typescript files nested
// in this folder. It is not required to import or call any of the declared functions.
