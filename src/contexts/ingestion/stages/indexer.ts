import { sparqlClient, REGISTRY_GRAPH, ONTOHUB_VOCAB, ontologyGraphUri } from '../../../lib/graphdb';
import type { ParseResult } from './parser';
import { Store, DataFactory } from 'n3';

const { namedNode, literal } = DataFactory;

export interface OntologyMetrics {
  classCount: number;
  propertyCount: number;
  prefixes: string[];
}

/**
 * Extracts class/property/prefix metrics from the parsed store,
 * then writes them as triples to the registry graph.
 */
export async function indexOntology(
  owner: string,
  repo: string,
  version: string,
  parsed: ParseResult,
  eventUri: string
): Promise<OntologyMetrics> {
  const store = parsed.store;
  const OWL_CLASS = 'http://www.w3.org/2002/07/owl#Class';
  const OWL_OBJ_PROP = 'http://www.w3.org/2002/07/owl#ObjectProperty';
  const OWL_DATA_PROP = 'http://www.w3.org/2002/07/owl#DatatypeProperty';
  const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

  const classes = store.getSubjects(RDF_TYPE, OWL_CLASS, null);
  const objProps = store.getSubjects(RDF_TYPE, OWL_OBJ_PROP, null);
  const dataProps = store.getSubjects(RDF_TYPE, OWL_DATA_PROP, null);

  const classCount = classes.length;
  const propertyCount = objProps.length + dataProps.length;
  const prefixes = Object.keys(parsed.prefixes);

  const graphUri = ontologyGraphUri(owner, repo, version);
  const prefixList = prefixes.map(p => `"${p}"`).join(', ');

  const metricsQuery = `
PREFIX ontohub: <${ONTOHUB_VOCAB}>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
  GRAPH <${REGISTRY_GRAPH}> {
    <${eventUri}>
      ontohub:classCount "${classCount}"^^xsd:integer ;
      ontohub:propertyCount "${propertyCount}"^^xsd:integer ;
      ontohub:namedGraph <${graphUri}> .
  }
}`;

  await sparqlClient.query.update(metricsQuery);

  return { classCount, propertyCount, prefixes };
}
