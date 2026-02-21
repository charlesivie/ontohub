import { Readable } from 'stream';
import { DataFactory } from 'n3';
import { sparqlClient, ontologyGraphUri } from '../../../lib/graphdb';
import type { ParseResult } from './parser';

const { namedNode } = DataFactory;

/**
 * Writes the parsed RDF store to a named graph in GraphDB using
 * SPARQL 1.1 Graph Store HTTP Protocol (PUT).
 * StreamStore.put() expects a Readable stream of quads and a NamedNode graph.
 */
export async function writeOntologyGraph(
  owner: string,
  repo: string,
  version: string,
  parsed: ParseResult
): Promise<string> {
  const graphUri = ontologyGraphUri(owner, repo, version);
  const quads = parsed.store.getQuads(null, null, null, null);

  // Create a Readable stream of quads for the Graph Store PUT
  const quadStream = Readable.from(quads);

  await sparqlClient.store.put(quadStream, { graph: namedNode(graphUri) });

  return graphUri;
}
