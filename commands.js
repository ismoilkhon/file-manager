import { readdir, readFile, writeFile, mkdir, rename, unlink, stat } from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { join, resolve, basename, dirname } from 'path';
import { EOL, cpus, homedir, userInfo, arch } from 'os';
import { createHash } from 'crypto';
import { createBrotliCompress, createBrotliDecompress } from 'zlib';
import { pipeline } from 'stream/promises';
import { printMessage } from './utils.js';

export async function handleCommand(input, cwd, username) {
  const [command, ...args] = input.split(' ').filter(Boolean);

  switch (command) {
    // Navigation & working directory
    case 'up':
      return up(cwd);
    case 'cd':
      return cd(cwd, args[0]);
    case 'ls':
      await ls(cwd);
      return cwd;

    // Basic file operations
    case 'cat':
      await cat(cwd, args[0]);
      return cwd;
    case 'add':
      await add(cwd, args[0]);
      return cwd;
    case 'mkdir':
      await mkdirCmd(cwd, args[0]);
      return cwd;
    case 'rn':
      await rn(cwd, args[0], args[1]);
      return cwd;
    case 'cp':
      await cp(cwd, args[0], args[1]);
      return cwd;
    case 'mv':
      await mv(cwd, args[0], args[1]);
      return cwd;
    case 'rm':
      await rm(cwd, args[0]);
      return cwd;

    // Operating system info
    case 'os':
      await osInfo(args[0]);
      return cwd;

    // Hash calculation
    case 'hash':
      await hash(cwd, args[0]);
      return cwd;

    // Compress and decompress
    case 'compress':
      await compress(cwd, args[0], args[1]);
      return cwd;
    case 'decompress':
      await decompress(cwd, args[0], args[1]);
      return cwd;

    default:
      throw new Error('Invalid input');
  }
}

function up(cwd) {
  const parent = dirname(cwd);
  // Prevent going above root
  if (parent === cwd) return cwd;
  return parent;
}

async function cd(cwd, path) {
  if (!path) throw new Error('Invalid input');
  const newPath = resolve(cwd, path);
  const stats = await stat(newPath).catch(() => null);
  if (!stats || !stats.isDirectory()) throw new Error('Operation failed');
  return newPath;
}

async function ls(cwd) {
  try {
    const entries = await readdir(cwd, { withFileTypes: true });
    const folders = [];
    const files = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        folders.push({ name: entry.name, type: 'dir' });
      } else {
        files.push({ name: entry.name, type: 'file' });
      }
    }

    // Sort alphabetically
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    // Print table
    console.table([...folders, ...files], ['name', 'type']);
  } catch {
    throw new Error('Operation failed');
  }
}

async function cat(cwd, filePath) {
  if (!filePath) throw new Error('Invalid input');
  const fullPath = resolve(cwd, filePath);
  const stream = createReadStream(fullPath);
  
  try {
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    process.stdout.write('\n');
  } catch {
    throw new Error('Operation failed');
  }
}

async function add(cwd, fileName) {
  if (!fileName) throw new Error('Invalid input');
  const fullPath = join(cwd, fileName);
  try {
    await writeFile(fullPath, '');
  } catch {
    throw new Error('Operation failed');
  }
}

async function mkdirCmd(cwd, dirName) {
  if (!dirName) throw new Error('Invalid input');
  const fullPath = join(cwd, dirName);
  try {
    await mkdir(fullPath);
  } catch {
    throw new Error('Operation failed');
  }
}

async function rn(cwd, filePath, newFileName) {
  if (!filePath || !newFileName) throw new Error('Invalid input');
  const fullPath = resolve(cwd, filePath);
  const newPath = join(dirname(fullPath), newFileName);
  try {
    await rename(fullPath, newPath);
  } catch {
    throw new Error('Operation failed');
  }
}

async function cp(cwd, filePath, destPath) {
  if (!filePath || !destPath) throw new Error('Invalid input');
  const sourcePath = resolve(cwd, filePath);
  const destFullPath = resolve(cwd, destPath);
  try {
    await pipeline(
      createReadStream(sourcePath),
      createWriteStream(destFullPath)
    );
  } catch {
    throw new Error('Operation failed');
  }
}

async function mv(cwd, filePath, destPath) {
  if (!filePath || !destPath) throw new Error('Invalid input');
  const sourcePath = resolve(cwd, filePath);
  const destFullPath = resolve(cwd, destPath);
  try {
    await pipeline(
      createReadStream(sourcePath),
      createWriteStream(destFullPath)
    );
    await unlink(sourcePath);
  } catch {
    throw new Error('Operation failed');
  }
}

async function rm(cwd, filePath) {
  if (!filePath) throw new Error('Invalid input');
  const fullPath = resolve(cwd, filePath);
  try {
    await unlink(fullPath);
  } catch {
    throw new Error('Operation failed');
  }
}

async function osInfo(flag) {
  switch (flag) {
    case '--EOL':
      console.log(JSON.stringify(EOL));
      break;
    case '--cpus':
      const cpuInfo = cpus().map(cpu => ({
        model: cpu.model,
        speed: (cpu.speed / 1000).toFixed(2) + ' GHz'
      }));
      console.log(`Total CPUs: ${cpuInfo.length}`);
      console.table(cpuInfo);
      break;
    case '--homedir':
      console.log(homedir());
      break;
    case '--username':
      console.log(userInfo().username);
      break;
    case '--architecture':
      console.log(arch());
      break;
    default:
      throw new Error('Invalid input');
  }
}

async function hash(cwd, filePath) {
  if (!filePath) throw new Error('Invalid input');
  const fullPath = resolve(cwd, filePath);
  const hash = createHash('sha256');
  const stream = createReadStream(fullPath);
  
  try {
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    console.log(hash.digest('hex'));
  } catch {
    throw new Error('Operation failed');
  }
}

async function compress(cwd, filePath, destPath) {
  if (!filePath || !destPath) throw new Error('Invalid input');
  const sourcePath = resolve(cwd, filePath);
  const destFullPath = resolve(cwd, destPath);
  try {
    await pipeline(
      createReadStream(sourcePath),
      createBrotliCompress(),
      createWriteStream(destFullPath)
    );
  } catch {
    throw new Error('Operation failed');
  }
}

async function decompress(cwd, filePath, destPath) {
  if (!filePath || !destPath) throw new Error('Invalid input');
  const sourcePath = resolve(cwd, filePath);
  const destFullPath = resolve(cwd, destPath);
  try {
    await pipeline(
      createReadStream(sourcePath),
      createBrotliDecompress(),
      createWriteStream(destFullPath)
    );
  } catch {
    throw new Error('Operation failed');
  }
}