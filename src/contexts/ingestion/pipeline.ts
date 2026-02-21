import { updateIngestionEventStatus } from '../registry/repository';
import { fetchOntology } from './stages/fetcher';
import { parseRdf } from './stages/parser';
import { validateShacl } from './stages/validator';
import { writeOntologyGraph } from './stages/writer';
import { indexOntology } from './stages/indexer';

export interface PipelineInput {
  owner: string;
  repo: string;
  ref: string;
  version: string;
  eventUri: string;
}

/**
 * Runs the full ingestion pipeline non-blocking.
 * NEVER await this inside the webhook handler.
 */
export async function runPipeline(input: PipelineInput): Promise<void> {
  const { owner, repo, ref, version, eventUri } = input;
  try {
    // Stage 1: Fetch
    const fetched = await fetchOntology(owner, repo, ref);

    // Stage 2: Parse
    const parsed = await parseRdf(fetched.content, fetched.contentType);

    // Stage 3: SHACL Validate — must pass before any write
    await validateShacl(parsed);

    // Stage 4: Write to named graph
    await writeOntologyGraph(owner, repo, version, parsed);

    // Stage 5: Index metrics
    await indexOntology(owner, repo, version, parsed, eventUri);

    // Final: mark event as Loaded
    await updateIngestionEventStatus(eventUri, 'Loaded');
  } catch (err) {
    console.error(`[pipeline] Ingestion failed for ${owner}/${repo}@${ref}:`, err);
    try {
      await updateIngestionEventStatus(eventUri, 'Failed');
    } catch (updateErr) {
      console.error('[pipeline] Failed to update event status to Failed:', updateErr);
    }
  }
}
