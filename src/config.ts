import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: parseInt(optional('PORT', '3001'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  sessionSecret: requireEnv('SESSION_SECRET'),
  graphdbUrl: optional('GRAPHDB_URL', 'http://localhost:7200'),
  graphdbRepository: optional('GRAPHDB_REPOSITORY', 'ontohub'),
  github: {
    clientId: requireEnv('GITHUB_CLIENT_ID'),
    clientSecret: requireEnv('GITHUB_CLIENT_SECRET'),
    callbackUrl: requireEnv('GITHUB_CALLBACK_URL'),
  },
  webhookEncryptionKey: requireEnv('WEBHOOK_ENCRYPTION_KEY'),
  webhookBaseUrl: requireEnv('WEBHOOK_BASE_URL'),
  frontendOrigin: optional('FRONTEND_ORIGIN', 'http://localhost:3000'),
} as const;

export type Config = typeof config;
