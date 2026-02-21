import { sparqlClient, REGISTRY_GRAPH, ONTOHUB_VOCAB } from '../../lib/graphdb';

// Mirror of web/types/ontology.ts — kept in sync manually
interface Ontology {
  owner: string;
  repo: string;
  description?: string;
  latestVersion: string;
  versions: string[];
}

interface OntologyVersion {
  owner: string;
  repo: string;
  version: string;
  iri: string;
  label?: string;
  description?: string;
  license?: string;
  namedGraph: string;
  stats: {
    classCount: number;
    propertyCount: number;
    prefixes: string[];
  };
  publishedAt: string;
}

export async function listOntologies(): Promise<Ontology[]> {
  const query = `
PREFIX ontohub: <${ONTOHUB_VOCAB}>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT ?regUri ?repoUrl ?latestVersion ?createdAt
FROM <${REGISTRY_GRAPH}>
WHERE {
  ?regUri a ontohub:Registration ;
          ontohub:githubRepo ?repoUrl ;
          ontohub:status ontohub:Active ;
          dcterms:created ?createdAt .
  OPTIONAL {
    ?event a ontohub:IngestionEvent ;
           ontohub:registration ?regUri ;
           ontohub:status ontohub:Loaded ;
           ontohub:gitRef ?latestVersion .
  }
}
ORDER BY ?repoUrl`;

  const stream = await sparqlClient.query.select(query);

  // Group results by repo, collecting all versions
  const map = new Map<string, { owner: string; repo: string; versions: string[] }>();

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (row: Record<string, { value: string }>) => {
      const repoUrl = row.repoUrl?.value ?? '';
      const match = repoUrl.match(/github\.com\/([^/]+)\/(.+)/);
      if (!match) return;
      const [, owner, repo] = match;
      const key = `${owner}/${repo}`;
      const version = row.latestVersion?.value ?? '';

      if (!map.has(key)) {
        map.set(key, { owner, repo, versions: [] });
      }
      if (version && !map.get(key)!.versions.includes(version)) {
        map.get(key)!.versions.push(version);
      }
    });
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return Array.from(map.values()).map(({ owner, repo, versions }) => ({
    owner,
    repo,
    latestVersion: versions[versions.length - 1] ?? '',
    versions,
  }));
}

export async function getOntologyVersion(
  owner: string,
  repo: string,
  version: string
): Promise<OntologyVersion | null> {
  const graphUri = `urn:ontohub:${owner}:${repo}:${version}`;

  // Query class/property stats and metadata from the registry
  const registryQuery = `
PREFIX ontohub: <${ONTOHUB_VOCAB}>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT ?classCount ?propertyCount ?createdAt
FROM <${REGISTRY_GRAPH}>
WHERE {
  ?event a ontohub:IngestionEvent ;
         ontohub:registration <urn:ontohub:registration:${owner}:${repo}> ;
         ontohub:gitRef "${version}" ;
         ontohub:status ontohub:Loaded .
  OPTIONAL { ?event ontohub:classCount ?classCount . }
  OPTIONAL { ?event ontohub:propertyCount ?propertyCount . }
  OPTIONAL { ?event dcterms:created ?createdAt . }
}
LIMIT 1`;

  const regStream = await sparqlClient.query.select(registryQuery);
  let classCount = 0;
  let propertyCount = 0;
  let publishedAt = '';

  await new Promise<void>((resolve, reject) => {
    regStream.on('data', (row: Record<string, { value: string }>) => {
      classCount = parseInt(row.classCount?.value ?? '0', 10);
      propertyCount = parseInt(row.propertyCount?.value ?? '0', 10);
      publishedAt = row.createdAt?.value ?? '';
    });
    regStream.on('end', resolve);
    regStream.on('error', reject);
  });

  // Query ontology metadata from the named graph
  const metaQuery = `
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT ?iri ?label ?description ?license
FROM <${graphUri}>
WHERE {
  ?iri a owl:Ontology .
  OPTIONAL { ?iri rdfs:label ?label . }
  OPTIONAL { ?iri dcterms:description ?description . }
  OPTIONAL { ?iri dcterms:license ?license . }
}
LIMIT 1`;

  let iri = graphUri;
  let label: string | undefined;
  let description: string | undefined;
  let license: string | undefined;

  try {
    const metaStream = await sparqlClient.query.select(metaQuery);
    await new Promise<void>((resolve, reject) => {
      metaStream.on('data', (row: Record<string, { value: string }>) => {
        iri = row.iri?.value ?? graphUri;
        label = row.label?.value;
        description = row.description?.value;
        license = row.license?.value;
      });
      metaStream.on('end', resolve);
      metaStream.on('error', reject);
    });
  } catch {
    // named graph may not exist yet
  }

  if (!publishedAt) return null;

  // Query prefixes used in the ontology graph
  const prefixQuery = `
SELECT DISTINCT ?prefix
FROM <${graphUri}>
WHERE {
  ?s ?p ?o .
  BIND(STRBEFORE(STR(?p), "#") AS ?ns)
  FILTER(?ns != "")
  BIND(REPLACE(?ns, ".*[/#]([^/#]+)$", "$1") AS ?prefix)
}
LIMIT 50`;

  const prefixes: string[] = [];
  try {
    const prefixStream = await sparqlClient.query.select(prefixQuery);
    await new Promise<void>((resolve, reject) => {
      prefixStream.on('data', (row: Record<string, { value: string }>) => {
        const p = row.prefix?.value;
        if (p) prefixes.push(p);
      });
      prefixStream.on('end', resolve);
      prefixStream.on('error', reject);
    });
  } catch {
    // best-effort
  }

  return {
    owner,
    repo,
    version,
    iri,
    label,
    description,
    license,
    namedGraph: graphUri,
    stats: { classCount, propertyCount, prefixes },
    publishedAt,
  };
}
