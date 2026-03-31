const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MAPS_DIR = path.join(ROOT, "mapas");
const OUT_JSON = path.join(ROOT, "map_connections.json");
const OUT_MD = path.join(ROOT, "map_connections.md");
const OUT_COMPACT_JSON = path.join(ROOT, "map_connections_compact.json");
const OUT_COMPACT_MD = path.join(ROOT, "map_connections_compact.md");
const OUT_MERMAID = path.join(ROOT, "map_connections.mmd");
const OUT_MERMAID_MD = path.join(ROOT, "map_connections_mermaid.md");
const OUT_MAP1_MERMAID = path.join(ROOT, "map_connections_map1_depth2.mmd");
const OUT_MAP1_MERMAID_MD = path.join(ROOT, "map_connections_map1_depth2_mermaid.md");
const OUT_MERMAID_HTML = path.join(ROOT, "map_connections.html");
const OUT_MAP1_MERMAID_HTML = path.join(ROOT, "map_connections_map1_depth2.html");

function getMapFiles() {
    return fs
        .readdirSync(MAPS_DIR)
        .filter((file) => /^mapa_\d+\.json$/.test(file))
        .sort((a, b) => {
            const mapA = Number(a.match(/\d+/)[0]);
            const mapB = Number(b.match(/\d+/)[0]);
            return mapA - mapB;
        });
}

function loadConnections() {
    const graph = {};
    const inbound = {};
    let totalExitTiles = 0;

    for (const file of getMapFiles()) {
        const mapId = Number(file.match(/\d+/)[0]);
        const raw = JSON.parse(fs.readFileSync(path.join(MAPS_DIR, file), "utf8"));
        const map = raw[mapId];
        const exitsByTarget = new Map();

        if (!map) {
            graph[mapId] = [];
            continue;
        }

        for (const y of Object.keys(map)) {
            const row = map[y];

            for (const x of Object.keys(row)) {
                const cell = row[x];

                if (!cell || !cell.tileExit) {
                    continue;
                }

                totalExitTiles += 1;

                const target = cell.tileExit;
                const key = `${target.map}:${target.x}:${target.y}`;

                if (!exitsByTarget.has(key)) {
                    exitsByTarget.set(key, {
                        from: {
                            map: mapId,
                            x: Number(x),
                            y: Number(y),
                        },
                        to: {
                            map: Number(target.map),
                            x: Number(target.x),
                            y: Number(target.y),
                        },
                        tiles: 0,
                    });
                }

                const edge = exitsByTarget.get(key);
                edge.tiles += 1;

                if (!inbound[target.map]) {
                    inbound[target.map] = [];
                }
            }
        }

        graph[mapId] = [...exitsByTarget.values()].sort((a, b) => {
            return (
                a.to.map - b.to.map ||
                a.from.y - b.from.y ||
                a.from.x - b.from.x
            );
        });

        for (const edge of graph[mapId]) {
            inbound[edge.to.map].push({
                from: edge.from,
                to: edge.to,
                tiles: edge.tiles,
            });
        }
    }

    for (const mapId of Object.keys(inbound)) {
        inbound[mapId].sort((a, b) => {
            return (
                a.from.map - b.from.map ||
                a.from.y - b.from.y ||
                a.from.x - b.from.x
            );
        });
    }

    return {
        summary: {
            maps: getMapFiles().length,
            mapsWithExits: Object.values(graph).filter((edges) => edges.length > 0)
                .length,
            totalExitTiles,
        },
        graph,
        inbound,
    };
}

function compactGraph(graph) {
    const compact = {};

    for (const [mapId, edges] of Object.entries(graph)) {
        const grouped = new Map();

        for (const edge of edges) {
            const key = String(edge.to.map);

            if (!grouped.has(key)) {
                grouped.set(key, {
                    toMap: edge.to.map,
                    links: 0,
                    tiles: 0,
                    fromMinX: edge.from.x,
                    fromMaxX: edge.from.x,
                    fromMinY: edge.from.y,
                    fromMaxY: edge.from.y,
                    toMinX: edge.to.x,
                    toMaxX: edge.to.x,
                    toMinY: edge.to.y,
                    toMaxY: edge.to.y,
                });
            }

            const item = grouped.get(key);
            item.links += 1;
            item.tiles += edge.tiles;
            item.fromMinX = Math.min(item.fromMinX, edge.from.x);
            item.fromMaxX = Math.max(item.fromMaxX, edge.from.x);
            item.fromMinY = Math.min(item.fromMinY, edge.from.y);
            item.fromMaxY = Math.max(item.fromMaxY, edge.from.y);
            item.toMinX = Math.min(item.toMinX, edge.to.x);
            item.toMaxX = Math.max(item.toMaxX, edge.to.x);
            item.toMinY = Math.min(item.toMinY, edge.to.y);
            item.toMaxY = Math.max(item.toMaxY, edge.to.y);
        }

        compact[mapId] = [...grouped.values()].sort((a, b) => a.toMap - b.toMap);
    }

    return compact;
}

function toMarkdown(data) {
    const lines = [];
    lines.push("# Map Connections");
    lines.push("");
    lines.push(`- Maps: ${data.summary.maps}`);
    lines.push(`- Maps with exits: ${data.summary.mapsWithExits}`);
    lines.push(`- Exit tiles: ${data.summary.totalExitTiles}`);
    lines.push("");

    const mapIds = Object.keys(data.graph)
        .map(Number)
        .sort((a, b) => a - b);

    for (const mapId of mapIds) {
        const exits = data.graph[mapId] || [];
        const inbound = data.inbound[mapId] || [];

        lines.push(`## Map ${mapId}`);
        lines.push("");

        if (exits.length === 0) {
            lines.push("No outgoing exits.");
        } else {
            lines.push("Outgoing:");
            for (const edge of exits) {
                lines.push(
                    `- (${edge.from.x},${edge.from.y}) -> Map ${edge.to.map} (${edge.to.x},${edge.to.y}) [tiles: ${edge.tiles}]`
                );
            }
        }

        lines.push("");

        if (inbound.length === 0) {
            lines.push("Incoming: none.");
        } else {
            lines.push("Incoming:");
            for (const edge of inbound) {
                lines.push(
                    `- Map ${edge.from.map} (${edge.from.x},${edge.from.y}) -> (${edge.to.x},${edge.to.y}) [tiles: ${edge.tiles}]`
                );
            }
        }

        lines.push("");
    }

    return `${lines.join("\n")}\n`;
}

function toCompactMarkdown(compact) {
    const lines = [];
    lines.push("# Map Connections Compact");
    lines.push("");

    const mapIds = Object.keys(compact)
        .map(Number)
        .sort((a, b) => a - b);

    for (const mapId of mapIds) {
        lines.push(`## Map ${mapId}`);
        lines.push("");

        if (!compact[mapId] || compact[mapId].length === 0) {
            lines.push("No outgoing exits.");
            lines.push("");
            continue;
        }

        for (const edge of compact[mapId]) {
            lines.push(
                `- Map ${edge.toMap}: links=${edge.links}, tiles=${edge.tiles}, from x=${edge.fromMinX}-${edge.fromMaxX} y=${edge.fromMinY}-${edge.fromMaxY}, to x=${edge.toMinX}-${edge.toMaxX} y=${edge.toMinY}-${edge.toMaxY}`
            );
        }

        lines.push("");
    }

    return `${lines.join("\n")}\n`;
}

function buildAdjacency(compact) {
    const adjacency = new Map();

    for (const [fromMap, edges] of Object.entries(compact)) {
        adjacency.set(
            Number(fromMap),
            edges.map((edge) => Number(edge.toMap))
        );
    }

    return adjacency;
}

function collectReachable(adjacency, root, maxDepth) {
    const queue = [{ map: root, depth: 0 }];
    const visited = new Map([[root, 0]]);

    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = adjacency.get(current.map) || [];

        if (current.depth >= maxDepth) {
            continue;
        }

        for (const next of neighbors) {
            if (!visited.has(next) || visited.get(next) > current.depth + 1) {
                visited.set(next, current.depth + 1);
                queue.push({ map: next, depth: current.depth + 1 });
            }
        }
    }

    return visited;
}

function toMermaid(compact, allowedMaps) {
    const lines = ["graph LR"];
    const mapIds = Object.keys(compact)
        .map(Number)
        .sort((a, b) => a - b);

    for (const mapId of mapIds) {
        if (allowedMaps && !allowedMaps.has(mapId)) {
            continue;
        }

        const edges = compact[mapId] || [];
        const filteredEdges = allowedMaps
            ? edges.filter((edge) => allowedMaps.has(Number(edge.toMap)))
            : edges;

        if (filteredEdges.length === 0) {
            lines.push(`  M${mapId}[Map ${mapId}]`);
            continue;
        }

        for (const edge of filteredEdges) {
            lines.push(
                `  M${mapId}[Map ${mapId}] -->|links ${edge.links}| M${edge.toMap}[Map ${edge.toMap}]`
            );
        }
    }

    return `${lines.join("\n")}\n`;
}

function wrapMermaid(markup, title) {
    return `# ${title}

\`\`\`mermaid
${markup.trimEnd()}
\`\`\`
`;
}

function toHtml(markup, title) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f1e8;
      color: #1a1a1a;
    }
    header {
      padding: 16px 20px;
      border-bottom: 1px solid #d7cfbf;
      background: #fffaf0;
      position: sticky;
      top: 0;
    }
    main {
      padding: 20px;
      overflow: auto;
    }
    .mermaid {
      min-width: 1200px;
    }
  </style>
</head>
<body>
  <header>
    <strong>${title}</strong>
  </header>
  <main>
    <pre class="mermaid">${markup.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>
  </main>
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({ startOnLoad: true, securityLevel: "loose", maxTextSize: 1000000 });
  </script>
</body>
</html>
`;
}

const data = loadConnections();
const compact = compactGraph(data.graph);
const adjacency = buildAdjacency(compact);
const map1Depth2 = new Set(collectReachable(adjacency, 1, 2).keys());
const mermaid = toMermaid(compact);
const mermaidMap1 = toMermaid(compact, map1Depth2);
fs.writeFileSync(OUT_JSON, `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync(OUT_MD, toMarkdown(data));
fs.writeFileSync(OUT_COMPACT_JSON, `${JSON.stringify(compact, null, 2)}\n`);
fs.writeFileSync(OUT_COMPACT_MD, toCompactMarkdown(compact));
fs.writeFileSync(OUT_MERMAID, mermaid);
fs.writeFileSync(
    OUT_MERMAID_MD,
    wrapMermaid(mermaid, "Map Connections Mermaid")
);
fs.writeFileSync(OUT_MAP1_MERMAID, mermaidMap1);
fs.writeFileSync(
    OUT_MAP1_MERMAID_MD,
    wrapMermaid(mermaidMap1, "Map Connections From Map 1 (Depth 2)")
);
fs.writeFileSync(OUT_MERMAID_HTML, toHtml(mermaid, "Map Connections Mermaid"));
fs.writeFileSync(
    OUT_MAP1_MERMAID_HTML,
    toHtml(mermaidMap1, "Map Connections From Map 1 (Depth 2)")
);

console.log(`Wrote ${OUT_JSON}`);
console.log(`Wrote ${OUT_MD}`);
console.log(`Wrote ${OUT_COMPACT_JSON}`);
console.log(`Wrote ${OUT_COMPACT_MD}`);
console.log(`Wrote ${OUT_MERMAID}`);
console.log(`Wrote ${OUT_MERMAID_MD}`);
console.log(`Wrote ${OUT_MAP1_MERMAID}`);
console.log(`Wrote ${OUT_MAP1_MERMAID_MD}`);
console.log(`Wrote ${OUT_MERMAID_HTML}`);
console.log(`Wrote ${OUT_MAP1_MERMAID_HTML}`);
