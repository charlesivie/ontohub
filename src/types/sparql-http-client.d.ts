declare module 'sparql-http-client' {
  import { Readable } from 'stream';
  import type { Term } from '@rdfjs/types';

  interface ClientOptions {
    endpointUrl?: string;
    updateUrl?: string;
    storeUrl?: string;
    user?: string;
    password?: string;
    headers?: Record<string, string>;
  }

  interface SelectRow {
    [key: string]: { value: string; termType: string };
  }

  interface SelectStream extends Readable {
    on(event: 'data', listener: (row: SelectRow) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  class StreamQuery {
    select(query: string, options?: Record<string, unknown>): SelectStream;
    update(query: string, options?: Record<string, unknown>): Promise<void>;
    construct(query: string, options?: Record<string, unknown>): Readable;
    ask(query: string, options?: Record<string, unknown>): Promise<boolean>;
  }

  class StreamStore {
    put(stream: Readable, options?: { graph?: Term }): Promise<void>;
    post(stream: Readable, options?: { graph?: Term }): Promise<void>;
    get(graph?: Term): Readable;
    delete(options?: { graph?: Term }): Promise<void>;
  }

  class StreamClient {
    query: StreamQuery;
    store: StreamStore;
    constructor(options: ClientOptions);
  }

  export default StreamClient;
  export { StreamClient, StreamQuery, StreamStore };
}
