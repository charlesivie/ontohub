export interface Ontology {
  owner: string;
  repo: string;
  description?: string;
  latestVersion: string;
  versions: string[];
}

export interface OntologyVersion {
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
