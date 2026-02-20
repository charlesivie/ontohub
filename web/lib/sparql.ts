// Helpers for working with SPARQL results returned by the Discovery API.

export interface SparqlBinding {
  [varName: string]: { type: string; value: string; datatype?: string };
}

export interface SparqlResults {
  results: { bindings: SparqlBinding[] };
}

export function bindingValue(binding: SparqlBinding, key: string): string {
  return binding[key]?.value ?? "";
}
