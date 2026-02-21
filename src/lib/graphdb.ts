import SparqlClient from 'sparql-http-client';
import { config } from '../config';

const endpointBase = `${config.graphdbUrl}/repositories/${config.graphdbRepository}`;

export const sparqlClient = new SparqlClient({
  endpointUrl: `${endpointBase}`,
  updateUrl: `${endpointBase}/statements`,
  storeUrl: `${endpointBase}/rdf-graphs/service`,
  user: process.env.GRAPHDB_USER,
  password: process.env.GRAPHDB_PASSWORD,
});

export const REGISTRY_GRAPH = 'urn:ontohub:registry';
export const ONTOHUB_VOCAB = 'https://ontohub.org/vocab#';

export function ontologyGraphUri(owner: string, repo: string, version: string): string {
  return `urn:ontohub:${owner}:${repo}:${version}`;
}
