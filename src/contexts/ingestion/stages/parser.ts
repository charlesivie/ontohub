import { Parser, Store, DataFactory } from 'n3';
import type { Quad } from 'n3';

const { namedNode } = DataFactory;

export interface ParseResult {
  store: Store;
  quadCount: number;
  prefixes: Record<string, string>;
}

const MEDIA_TYPE_MAP: Record<string, string> = {
  'text/turtle': 'Turtle',
  'application/rdf+xml': 'application/rdf+xml',
  'text/n3': 'N3',
  'application/trig': 'TriG',
  'application/n-triples': 'N-Triples',
  'application/n-quads': 'N-Quads',
  'application/ld+json': 'JSON-LD',
};

export async function parseRdf(content: string, contentType: string): Promise<ParseResult> {
  const format = MEDIA_TYPE_MAP[contentType] ?? 'Turtle';
  const store = new Store();
  const prefixes: Record<string, string> = {};

  await new Promise<void>((resolve, reject) => {
    const parser = new Parser({ format });
    parser.parse(content, (error: Error | null, quad: Quad | null, quadPrefixes: Record<string, unknown>) => {
      if (error) return reject(error);
      if (quad) {
        store.add(quad);
      } else {
        // quad is null on completion — prefixes available
        if (quadPrefixes) {
          for (const [prefix, iri] of Object.entries(quadPrefixes)) {
            prefixes[prefix] = String(iri);
          }
        }
        resolve();
      }
    });
  });

  return { store, quadCount: store.size, prefixes };
}
