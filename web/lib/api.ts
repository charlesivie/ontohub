import type { Ontology, OntologyVersion } from "@/types/ontology";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export function getOntologies(): Promise<Ontology[]> {
  return apiFetch("/ontologies");
}

export function getOntologyVersion(
  owner: string,
  repo: string,
  version: string
): Promise<OntologyVersion> {
  return apiFetch(`/ontologies/${owner}/${repo}/${version}`);
}
