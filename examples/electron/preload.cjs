'use strict';

// Electron sandboxed preload scripts use CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('cssxExample', Object.freeze({ platform: process.platform }));
