import { homedir } from 'os';
import { parseArgs } from 'util';
import { createInterface } from 'readline/promises';
import { dirname, resolve } from 'path';
import { handleCommand } from './commands.js';
import { printCwd, printMessage } from './utils.js';

// Parse CLI arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { username: { type: 'string' } },
});
const username = values.username || 'User';

// Set initial working directory to user's home directory
let cwd = homedir();

// Initialize readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Handle process exit
process.on('SIGINT', () => {
  printMessage(`Thank you for using File Manager, ${username}, goodbye!`);
  rl.close();
  process.exit(0);
});

// Main application loop
async function start() {
  printMessage(`Welcome to the File Manager, ${username}!`);
  printCwd(cwd);

  while (true) {
    const input = await rl.question('> ');
    const command = input.trim();

    if (command === '.exit') {
      printMessage(`Thank you for using File Manager, ${username}, goodbye!`);
      rl.close();
      process.exit(0);
    }

    try {
      const newCwd = await handleCommand(command, cwd, username);
      if (newCwd) cwd = newCwd;
    } catch (error) {
      printMessage(error.message);
    }
    printCwd(cwd);
  }
}

start().catch((error) => {
  printMessage(`Error: ${error.message}`);
  rl.close();
});