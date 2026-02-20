import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register Ontology",
};

export default function RegisterPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Register an Ontology</h1>
      <p className="mt-2 text-muted-foreground">
        Link a GitHub repository to Ontohub. Releases and tags will
        automatically trigger ingestion.
      </p>
      {/* TODO: RegisterRepoForm */}
    </main>
  );
}
