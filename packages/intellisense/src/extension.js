'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

/** Public extension activation hook. */
const { activate } = require('./activate');
/** Public extension deactivation hook. */
const { deactivate } = require('./deactivate');
/** Deferred editor API loader. */
const { loadEditorApi } = require('./load-editor-api');

module.exports = { activate, deactivate, loadEditorApi };
