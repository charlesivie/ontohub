import { sparqlClient, REGISTRY_GRAPH, ONTOHUB_VOCAB } from '../../lib/graphdb';

export interface RegistrationRecord {
  owner: string;
  repo: string;
  registeredBy: string;
  webhookId: string;
  webhookSecretEnc: string;
  status: string;
  createdAt: string;
}

export async function createRegistration(reg: RegistrationRecord): Promise<void> {
  const regUri = `urn:ontohub:registration:${reg.owner}:${reg.repo}`;
  const userUri = reg.registeredBy;
  const repoUrl = `https://github.com/${reg.owner}/${reg.repo}`;
  const now = reg.createdAt;

  const query = `
PREFIX ontohub: <${ONTOHUB_VOCAB}>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
  GRAPH <${REGISTRY_GRAPH}> {
    <${regUri}>
      a ontohub:Registration ;
      ontohub:registeredBy <${userUri}> ;
      ontohub:githubRepo <${repoUrl}> ;
      ontohub:webhookId "${reg.webhookId}" ;
      ontohub:webhookSecretEnc "${reg.webhookSecretEnc}" ;
      ontohub:status ontohub:Active ;
      dcterms:created "${now}"^^xsd:dateTime .
  }
}`;

  await sparqlClient.query.update(query);
}

export async function listRegistrationsByUser(userId: string): Promise<RegistrationRecord[]> {
  const query = `
PREFIX ontohub: <${ONTOHUB_VOCAB}>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT ?reg ?owner ?repo ?webhookId ?webhookSecretEnc ?status ?createdAt
FROM <${REGISTRY_GRAPH}>
WHERE {
  ?reg a ontohub:Registration ;
       ontohub:registeredBy <${userId}> ;
       ontohub:githubRepo ?repoUrl ;
       ontohub:webhookId ?webhookId ;
       ontohub:webhookSecretEnc ?webhookSecretEnc ;
       ontohub:status ?status ;
       dcterms:created ?createdAt .
  BIND(REPLACE(STR(?repoUrl), "https://github.com/([^/]+)/.*", "$1") AS ?owner)
  BIND(REPLACE(STR(?repoUrl), "https://github.com/[^/]+/(.+)", "$1") AS ?repo)
}`;

  const stream = await sparqlClient.query.select(query);
  const results: RegistrationRecord[] = [];

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (row: Record<string, { value: string }>) => {
      results.push({
        owner: row.owner?.value ?? '',
        repo: row.repo?.value ?? '',
        registeredBy: userId,
        webhookId: row.webhookId?.value ?? '',
        webhookSecretEnc: row.webhookSecretEnc?.value ?? '',
        status: row.status?.value ?? '',
        createdAt: row.createdAt?.value ?? '',
      });
    });
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return results;
}

export async function getRegistrationSecret(owner: string, repo: string): Promise<string | null> {
  const regUri = `urn:ontohub:registration:${owner}:${repo}`;
  const query = `
PREFIX ontohub: <${ONTOHUB_VOCAB}>

SELECT ?secret
FROM <${REGISTRY_GRAPH}>
WHERE {
  <${regUri}> ontohub:webhookSecretEnc ?secret .
}`;

  const stream = await sparqlClient.query.select(query);
  let secret: string | null = null;

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (row: Record<string, { value: string }>) => {
      secret = row.secret?.value ?? null;
    });
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return secret;
}

export async function writeIngestionEvent(opts: {
  eventUri: string;
  registrationUri: string;
  gitRef: string;
  status: string;
  createdAt: string;
}): Promise<void> {
  const query = `
PREFIX ontohub: <${ONTOHUB_VOCAB}>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
  GRAPH <${REGISTRY_GRAPH}> {
    <${opts.eventUri}>
      a ontohub:IngestionEvent ;
      ontohub:registration <${opts.registrationUri}> ;
      ontohub:gitRef "${opts.gitRef}" ;
      ontohub:status ontohub:${opts.status} ;
      dcterms:created "${opts.createdAt}"^^xsd:dateTime .
  }
}`;

  await sparqlClient.query.update(query);
}

export async function updateIngestionEventStatus(eventUri: string, status: string): Promise<void> {
  const query = `
PREFIX ontohub: <${ONTOHUB_VOCAB}>

DELETE {
  GRAPH <${REGISTRY_GRAPH}> {
    <${eventUri}> ontohub:status ?old .
  }
}
INSERT {
  GRAPH <${REGISTRY_GRAPH}> {
    <${eventUri}> ontohub:status ontohub:${status} .
  }
}
WHERE {
  GRAPH <${REGISTRY_GRAPH}> {
    <${eventUri}> ontohub:status ?old .
  }
}`;

  await sparqlClient.query.update(query);
}
