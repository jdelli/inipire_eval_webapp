/*
  Generate Angular environment files from .env or Vercel env vars
  Usage:
    node scripts/generate-env.cjs            # defaults to development
    node scripts/generate-env.cjs production # for production builds
*/

const fs = require('fs');
const path = require('path');

// Load .env if present (local dev). On Vercel, env vars are provided at build time.
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch (e) {
  // dotenv not installed yet or no .env; ignore, as we may be on CI with env vars
}

const mode = (process.argv[2] || 'development').toLowerCase();
const isProd = mode === 'production';

function getEnv(name, fallback = '') {
  const v = process.env[name];
  return v !== undefined && v !== '' ? v : fallback;
}

const defaults = {
  devCompany: 'inspire-holdings',
  prodCompany: 'inspire-next',
};

const firebase = {
  apiKey: getEnv('FIREBASE_API_KEY', ''),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN', ''),
  projectId: getEnv('FIREBASE_PROJECT_ID', ''),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET', ''),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID', ''),
  appId: getEnv('FIREBASE_APP_ID', ''),
  measurementId: getEnv('FIREBASE_MEASUREMENT_ID', ''),
};

const defaultCompanyId = getEnv(
  'DEFAULT_COMPANY_ID',
  isProd ? defaults.prodCompany : defaults.devCompany
);

function toTs(envObj) {
  return (
    'export const environment = ' +
    JSON.stringify(envObj, null, 2)
      // ensure single quotes to match TS style
      .replace(/"/g, "'") +
    ' as const;\n'
  );
}

/** Write both environment files so either build works reliably */
function writeFiles() {
  const devEnv = {
    production: false,
    firebase,
    defaultCompanyId,
  };
  const prodEnv = {
    production: true,
    firebase,
    defaultCompanyId,
  };

  const envDir = path.resolve(process.cwd(), 'src', 'environments');
  const devPath = path.join(envDir, 'environment.ts');
  const prodPath = path.join(envDir, 'environment.production.ts');

  fs.mkdirSync(envDir, { recursive: true });
  fs.writeFileSync(devPath, toTs(devEnv), 'utf8');
  fs.writeFileSync(prodPath, toTs(prodEnv), 'utf8');

  console.log(`[env] Wrote ${path.relative(process.cwd(), devPath)} and ${path.relative(process.cwd(), prodPath)}`);
}

writeFiles();
