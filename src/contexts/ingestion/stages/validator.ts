import SHACLValidator from 'rdf-validate-shacl';
import { Store, Parser } from 'n3';
import type { ParseResult } from './parser';

// Minimal SHACL shapes — can be extended with ontology-specific shapes
const BASIC_SHAPES_TTL = `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
`;

export class ShaclValidationError extends Error {
  constructor(public violations: string[]) {
    super(`SHACL validation failed: ${violations.join('; ')}`);
    this.name = 'ShaclValidationError';
  }
}

async function loadShapes(): Promise<Store> {
  const shapesStore = new Store();
  await new Promise<void>((resolve, reject) => {
    const parser = new Parser({ format: 'Turtle' });
    parser.parse(BASIC_SHAPES_TTL, (err, quad) => {
      if (err) return reject(err);
      if (quad) shapesStore.add(quad);
      else resolve();
    });
  });
  return shapesStore;
}

/**
 * Validates the parsed RDF store against SHACL shapes.
 * Throws ShaclValidationError if any violations are found.
 */
export async function validateShacl(parsed: ParseResult): Promise<void> {
  const shapesStore = await loadShapes();
  const validator = new SHACLValidator(shapesStore, {});
  // validate() is synchronous
  const report = validator.validate(parsed.store);

  if (!report.conforms) {
    const violations = (report.results as Array<{ message?: Array<{ value: string }> }>).map(
      (r) => r.message?.map((m) => m.value).join(', ') ?? 'Unknown violation'
    );
    throw new ShaclValidationError(violations);
  }
}
