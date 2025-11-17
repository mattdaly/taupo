#!/usr/bin/env node
import { Command } from 'commander';
import { buildCommand } from './commands/build.js';
import { devCommand } from './commands/dev.js';

const program = new Command();

program
    .name('taupo')
    .description('CLI for Taupo - AI Agent Framework')
    .version('0.0.0');

program
    .command('build')
    .description('Build your Taupo application for deployment')
    .option('-e, --entry <path>', 'Entry point file', './src/index.ts')
    .option('-o, --output <path>', 'Output directory', './.taupo')
    .action(buildCommand);

program
    .command('dev')
    .description('Start development server with hot reload')
    .option('-e, --entry <path>', 'Entry point file', './src/index.ts')
    .option('-p, --port <number>', 'Port to run on', '3000')
    .action(devCommand);

program.parse();

