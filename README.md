# mcp-quickgo

QuickGO (EBI) MCP — Gene Ontology browser.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_terms` | QuickGO (EBI) — search Gene Ontology (GO) terms by keyword. Returns matching GO terms (id + name) for a free-text query like "apoptosis". Keyless. |
| `get_term` | QuickGO (EBI) — get a single Gene Ontology (GO) term by id. Returns its name, aspect (biological_process\|molecular_function\|cellular_component), definition, synonyms, and obsolete flag. Keyless. |
| `gene_annotations` | QuickGO (EBI) — list the Gene Ontology (GO) annotations for a gene/protein, identified by UniProt accession (e.g. "P04637"). Returns GO ids, names, aspect, evidence, and taxon. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "quickgo": {
      "url": "https://gateway.pipeworx.io/quickgo/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Quickgo data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
