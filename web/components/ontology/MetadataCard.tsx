import type { OntologyVersion } from "@/types/ontology";

interface MetadataCardProps {
  ontology: OntologyVersion;
}

export function MetadataCard({ ontology }: MetadataCardProps) {
  return (
    <dl className="grid grid-cols-2 gap-4 rounded-lg border p-6 text-sm">
      <div>
        <dt className="font-medium text-muted-foreground">IRI</dt>
        <dd className="mt-1 font-mono break-all">{ontology.iri}</dd>
      </div>
      <div>
        <dt className="font-medium text-muted-foreground">Version</dt>
        <dd className="mt-1 font-mono">{ontology.version}</dd>
      </div>
      <div>
        <dt className="font-medium text-muted-foreground">Classes</dt>
        <dd className="mt-1">{ontology.stats.classCount}</dd>
      </div>
      <div>
        <dt className="font-medium text-muted-foreground">Properties</dt>
        <dd className="mt-1">{ontology.stats.propertyCount}</dd>
      </div>
      {ontology.license && (
        <div>
          <dt className="font-medium text-muted-foreground">License</dt>
          <dd className="mt-1">{ontology.license}</dd>
        </div>
      )}
    </dl>
  );
}
