import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { encrypt } from '../../lib/crypto';
import { createRegistration, listRegistrationsByUser, RegistrationRecord } from './repository';

export interface RegistrationResult {
  owner: string;
  repo: string;
  webhookId: string;
}

export async function registerRepo(
  owner: string,
  repo: string,
  userId: string,
  githubToken: string
): Promise<RegistrationResult> {
  // Generate a random webhook secret
  const webhookSecret = randomBytes(32).toString('hex');
  const encryptedSecret = encrypt(webhookSecret, config.webhookEncryptionKey);

  // Install webhook via GitHub API
  const hookUrl = `${config.webhookBaseUrl}/webhooks/${owner}/${repo}`;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/hooks`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'ontohub-backend/0.1',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'release', 'create'],
        config: {
          url: hookUrl,
          content_type: 'json',
          secret: webhookSecret,
          insecure_ssl: '0',
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub webhook install failed: ${response.status} ${text}`);
  }

  const hook = (await response.json()) as { id: number };
  const webhookId = String(hook.id);

  const reg: RegistrationRecord = {
    owner,
    repo,
    registeredBy: userId,
    webhookId,
    webhookSecretEnc: encryptedSecret,
    status: 'Active',
    createdAt: new Date().toISOString(),
  };

  await createRegistration(reg);

  return { owner, repo, webhookId };
}

export async function listUserRegistrations(userId: string): Promise<RegistrationRecord[]> {
  return listRegistrationsByUser(userId);
}
