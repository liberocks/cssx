'use strict';

/** Completion lookup exported through the public catalog module. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { entries } = require('./catalog-entries');
/** Hover documentation exported through the public catalog module. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { documentation } = require('./catalog-documentation');

module.exports = { entries, documentation };
