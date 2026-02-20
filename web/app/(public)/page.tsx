import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover Ontologies",
};

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold tracking-tight">Ontohub</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The central registry for semantic ontologies. Browse, discover, and
        reuse OWL/RDF models.
      </p>
      {/* TODO: OntologySearchBar, OntologyList */}
    </main>
  );
}
