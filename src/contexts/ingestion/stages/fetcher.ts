export interface FetchedOntology {
  content: string;
  contentType: string;
  downloadUrl: string;
}

const RDF_EXTENSIONS = ['.ttl', '.owl', '.rdf', '.n3', '.trig', '.nt', '.nq', '.jsonld'];

/**
 * Fetches raw RDF content from a GitHub repository at a specific ref.
 * Looks for common RDF file extensions in the repo root.
 */
export async function fetchOntology(
  owner: string,
  repo: string,
  ref: string,
  githubToken?: string
): Promise<FetchedOntology> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'ontohub-backend/0.1',
  };
  if (githubToken) headers.Authorization = `token ${githubToken}`;

  // Get the tree at the ref
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=0`,
    { headers }
  );
  if (!treeRes.ok) {
    throw new Error(`GitHub API tree fetch failed: ${treeRes.status}`);
  }

  const tree = (await treeRes.json()) as { tree: Array<{ path: string; type: string }> };
  const rdfFile = tree.tree.find(
    f => f.type === 'blob' && RDF_EXTENSIONS.some(ext => f.path.endsWith(ext))
  );

  if (!rdfFile) {
    throw new Error(`No RDF file found in ${owner}/${repo}@${ref}`);
  }

  // Fetch raw content
  const rawRes = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${rdfFile.path}`,
    { headers: { 'User-Agent': 'ontohub-backend/0.1' } }
  );
  if (!rawRes.ok) {
    throw new Error(`Failed to fetch ${rdfFile.path}: ${rawRes.status}`);
  }

  const content = await rawRes.text();
  const ext = RDF_EXTENSIONS.find(e => rdfFile.path.endsWith(e)) ?? '.ttl';
  const contentTypeMap: Record<string, string> = {
    '.ttl': 'text/turtle',
    '.owl': 'application/rdf+xml',
    '.rdf': 'application/rdf+xml',
    '.n3': 'text/n3',
    '.trig': 'application/trig',
    '.nt': 'application/n-triples',
    '.nq': 'application/n-quads',
    '.jsonld': 'application/ld+json',
  };

  return {
    content,
    contentType: contentTypeMap[ext] ?? 'text/turtle',
    downloadUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${rdfFile.path}`,
  };
}
