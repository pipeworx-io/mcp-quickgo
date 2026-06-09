interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * QuickGO (EBI) MCP — Gene Ontology browser.
 *
 * Wraps the keyless EBI QuickGO API: search GO terms by keyword, get a GO
 * term's definition/aspect/synonyms, and list the GO annotations for a
 * gene/protein (by UniProt accession). Keyless.
 */


const BASE = 'https://www.ebi.ac.uk/QuickGO/services';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_terms',
    description:
      'QuickGO (EBI) — search Gene Ontology (GO) terms by keyword. Returns matching GO terms (id + name) for a free-text query like "apoptosis". Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text keyword to search GO terms, e.g. "apoptosis".' },
        limit: { type: 'number', description: 'Max results (default 15, max 100).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_term',
    description:
      'QuickGO (EBI) — get a single Gene Ontology (GO) term by id. Returns its name, aspect (biological_process|molecular_function|cellular_component), definition, synonyms, and obsolete flag. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'A GO id, e.g. "GO:0006915".' },
      },
      required: ['id'],
    },
  },
  {
    name: 'gene_annotations',
    description:
      'QuickGO (EBI) — list the Gene Ontology (GO) annotations for a gene/protein, identified by UniProt accession (e.g. "P04637"). Returns GO ids, names, aspect, evidence, and taxon. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        gene_product_id: { type: 'string', description: 'A UniProt accession, e.g. "P04637".' },
        limit: { type: 'number', description: 'Max annotations (default 25, max 100).' },
      },
      required: ['gene_product_id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_terms':
        return await searchTerms(args);
      case 'get_term':
        return await getTerm(args);
      case 'gene_annotations':
        return await geneAnnotations(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function searchTerms(args: Record<string, unknown>): Promise<unknown> {
  const query = reqStr(args, 'query');
  const limit = clampLimit(args.limit, 15);
  const data = (await goGet(
    `/ontology/go/search?query=${encodeURIComponent(query)}&limit=${limit}&page=1`,
  )) as { numberOfHits?: number; results?: Array<{ id?: string; name?: string }> };
  const terms = (data.results ?? []).map((r) => ({ id: r.id, name: r.name }));
  return { count: data.numberOfHits ?? terms.length, terms };
}

async function getTerm(args: Record<string, unknown>): Promise<unknown> {
  const id = reqStr(args, 'id');
  const data = (await goGet(`/ontology/go/terms/${encodeURIComponent(id)}`)) as {
    results?: Array<{
      id?: string;
      name?: string;
      aspect?: string;
      definition?: { text?: string };
      synonyms?: Array<{ name?: string; type?: string }>;
      isObsolete?: boolean;
    }>;
  };
  const term = data.results?.[0];
  if (!term) return { error: 'GO term not found', id };
  return {
    id: term.id,
    name: term.name,
    aspect: term.aspect,
    definition: term.definition?.text,
    synonyms: (term.synonyms ?? []).map((s) => s.name),
    obsolete: term.isObsolete,
  };
}

async function geneAnnotations(args: Record<string, unknown>): Promise<unknown> {
  const geneProductId = reqStr(args, 'gene_product_id');
  const limit = clampLimit(args.limit, 25);
  const data = (await goGet(
    `/annotation/search?geneProductId=${encodeURIComponent(geneProductId)}&limit=${limit}`,
  )) as {
    numberOfHits?: number;
    results?: Array<{
      goId?: string;
      goName?: string | null;
      goAspect?: string;
      evidenceCode?: string;
      qualifier?: string;
      taxonId?: number;
    }>;
  };
  const annotations = (data.results ?? []).slice(0, limit).map((r) => ({
    go_id: r.goId,
    go_name: r.goName,
    aspect: r.goAspect,
    evidence: r.evidenceCode,
    qualifier: r.qualifier,
    taxon: r.taxonId,
  }));
  return { gene_product_id: geneProductId, count: data.numberOfHits ?? annotations.length, annotations };
}

async function goGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`QuickGO: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing.`);
  return v.trim();
}

function clampLimit(v: unknown, def: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : def;
  return Math.max(1, Math.min(100, n));
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
