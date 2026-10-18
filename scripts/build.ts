#!/usr/bin/env node
// Writes the one-file page to the folder given (default dist) and prints its path.

import { build } from '../src/build.ts';

console.log(build(process.argv[2] || 'dist'));
