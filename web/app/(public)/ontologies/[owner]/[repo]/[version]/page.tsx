import type { Metadata } from "next";
import { getOntologyVersion } from "@/lib/api";
import { MetadataCard } from "@/components/ontology/MetadataCard";

// Ontology versions are immutable once published — cache forever.
export const revalidate = false;

type Props = {
  params: Promise<{ owner: string; repo: string; version: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo, version } = await params;
  return {
    title: `${owner}/${repo} ${version}`,
    description: `Ontology ${owner}/${repo} at version ${version}`,
  };
}

export default async function OntologyVersionPage({ params }: Props) {
  const { owner, repo, version } = await params;
  const ontology = await getOntologyVersion(owner, repo, version);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">
        {owner}/{repo}
      </h1>
      <p className="mt-1 font-mono text-sm text-muted-foreground">{version}</p>

      <div className="mt-8">
        <MetadataCard ontology={ontology} />
      </div>

      {/* TODO: ClassExplorer (react-force-graph, client component) */}
      {/* TODO: PropertyList */}
      {/* TODO: SPARQL editor (CodeMirror 6, client component) */}
    </main>
  );
}
