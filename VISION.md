# VISION.md: The Ontology Hub

## 1. Executive Summary
The Ontology Hub is a central registry and discovery engine for semantic models. It serves as the "Maven Repository" for the Semantic Web, providing a standardized way to publish, browse, and reuse ontologies. By leveraging **GitHub** for identity and **SPARQL 1.1** for graph operations, the Hub ensures that ontologies are as easy to manage as modern software dependencies.

## 2. The Problem
Ontologies currently suffer from a "discovery gap." They are hosted in disparate locations with no unified versioning or publishing standard. Developers cannot easily "pull" a vocabulary into their projects, and authors lack a simple, automated way to make their models public, searchable, and machine-readable.

## 3. Core Pillars

### A. Git-Native Publishing ("Push-to-Registry")
* **Identity:** Authentication is handled exclusively via **GitHub OAuth 2.0**.
* **Workflow:** Authors register their ontology by linking its GitHub repository to the Hub.
* **The Sync Engine:** The Hub monitors Git events. When a user pushes to a specific branch or creates a tagged Release, the Hub triggers an automated ingestion pipeline.
* **Source of Truth:** The GitHub repository remains the immutable source of truth; the Hub acts as the indexer, validator, and search provider.

### B. Standardized Graph Interface (SPARQL 1.1)
* **Graph Store Protocol:** The Hub uses the **SPARQL 1.1 Graph Store HTTP Protocol** to manage the lifecycle of RDF data. Ingested ontologies are stored in dedicated **Named Graphs**, ensuring clean multi-tenancy and isolation.
* **Update & Query:** All internal synchronization and public discovery features are powered by standard **SPARQL 1.1 Update** and **Query** operations, ensuring the backend is compatible with any compliant triple store.
* **Validation:** Ingested models are validated against **SHACL** (Shapes Constraint Language) shapes to ensure metadata completeness and structural integrity before they are made public.

### C. Discovery & Metadata Management
* **Automated Indexing:** Upon ingestion, the Hub runs an "inspection" suite of SPARQL queries to extract key ontology metrics: classes, properties, defined prefixes, and imports.
* **Browsing:** A modern JavaScript/React interface allows users to explore these graph structures visually without needing to write raw SPARQL.
* **Registry API:** A public SPARQL endpoint allows third-party tools to programmatically resolve ontology "coordinates" (e.g., `owner/repo/version`) to their RDF content.



## 4. Technical Strategy
* **Backend:** Node.js using the `sparql-http-client` library for all database interactions.
* **Storage:** Any triple store supporting the **SPARQL 1.1 Protocol** (Query, Update, and Graph Store HTTP Protocol).
* **Versioning:** Maps 1:1 with Git tags and commit hashes.
* **Licensing:** All published ontologies must include standard metadata (e.g., `dcterms:license`) to be indexed and served.