// SECURITY: password is never logged or written to any file in plaintext
'use strict';

const path = require('path');
const readline = require('readline');

// Password policy validation
function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter (A-Z)';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number (0-9)';
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`"']/.test(pw)) return 'Password must contain at least one special character';
  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { email: '', password: '', help: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') { result.help = true; }
    else if (args[i].startsWith('--email=')) result.email = args[i].slice(8);
    else if (args[i] === '--email' && i + 1 < args.length) result.email = args[++i];
    else if (args[i].startsWith('--password=')) result.password = args[i].slice(11);
    else if (args[i] === '--password' && i + 1 < args.length) result.password = args[++i];
  }
  return result;
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    console.log('');
    console.log('Usage: node cli/reset-admin.js              (interactive — recommended)');
    console.log('       node cli/reset-admin.js --email=E --password=P');
    console.log('');
    console.log('In Docker:');
    console.log('  docker exec -it call-track node /app/cli/reset-admin.js');
    console.log('');
    console.log('Interactive mode hides the password while typing.');
    console.log('Use interactive mode to keep credentials out of shell history.');
    console.log('');
    process.exit(0);
  }

  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');

  let email = args.email.trim();
  let password = args.password;

  const rl = readline.createInterface({
    input: process.stdin,
    output: (!email || !password) ? process.stdout : null,
    terminal: !email || !password,
  });

  if (!email) {
    email = await new Promise(resolve => rl.question('Admin email address: ', ans => resolve(ans.trim().toLowerCase())));
  }

  if (!email || !email.includes('@')) {
    console.error('[ERROR] Invalid email address.');
    rl.close();
    process.exit(1);
  }

  if (!password) {
    process.stdout.write('New admin password: ');
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    password = await new Promise(resolve => {
      let pw = '';
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', function onData(ch) {
        const c = ch.toString();
        if (c === '\n' || c === '\r' || c === '\u0003') {
          process.stdin.removeListener('data', onData);
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          process.stdout.write('\n');
          resolve(pw);
        } else if (c === '\u007f') {
          pw = pw.slice(0, -1);
        } else {
          pw += c;
        }
      });
    });
  }

  rl.close();

  const validationError = validatePassword(password);
  if (validationError) {
    console.error('[ERROR] ' + validationError);
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 10);
  password = null; // clear from memory ASAP

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!existing) {
      console.error('[ERROR] No user found with email: ' + email);
      console.error('Tip: Check SEED_CREDENTIALS.txt for the correct admin email.');
      await prisma.$disconnect();
      process.exit(1);
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: hash, role: 'ADMIN' },
    });

    console.log('✅ Administrator password updated for: ' + email);
    await prisma.$disconnect();
  } catch (err) {
    await prisma.$disconnect();
    throw err;
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
