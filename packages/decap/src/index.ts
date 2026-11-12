#!/usr/bin/env node
// The `decap` binary. Kept to this one call so the commands stay importable
// (and testable) without running anything: see main.ts.
import { run } from './main';

void run(process.argv.slice(2));
