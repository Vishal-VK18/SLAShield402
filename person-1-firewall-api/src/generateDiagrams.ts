import fs from 'fs';

const seq = `sequenceDiagram
    participant Agent as AI Agent / Client
    participant Shield as SLAShield402 (Person 1)
    participant Indexer as Algorand Indexer (verification)
    participant SLA as SLA Validator (Person 2)
    participant Contract as Escrow Contract (Person 3, App #769236555)
    participant Target as Target API (simulated)

    Agent->>Shield: 1. POST /shield/check
    Shield-->>Agent: 2. 402 Payment Required (price, CAIP-2, ASA 10458941)
    Note over Agent: 3. sign USDC ASA transfer (axfer)
    Agent->>Shield: 4. retry with X-Payment-Proof
    Shield->>Indexer: 5. verify tx on-chain
    Indexer-->>Shield: confirmed round
    Shield->>Target: 6. outgoing x402 call (simulated target)
    Target-->>Shield: response data
    Shield->>SLA: 7. validate outcome (freshness/format/latency)
    SLA-->>Shield: PASS or FAIL
    Shield->>Contract: 8. spawn subprocess (settle.py / refundAndPenalize.py)
    Contract-->>Shield: settlement/refund tx id
    Shield-->>Agent: 9. 200 OK + shield_fee_tx + settlement_tx_id`;

const flow = `flowchart LR
    Client["AI Agent / Client"]
    Server["SLAShield402<br/>Firewall + x402 Gateway"]
    Indexer["Algorand Indexer<br/>(verification)"]
    SLA["SLA Validator<br/>(Person 2)"]
    Contract["Escrow Smart Contract<br/>App #769236555"]
    Dashboard["Real-Time Dashboard<br/>(WebSocket, observability)"]

    Client -->|1. request| Server
    Server -->|2. 402 + price| Client
    Client -->|3. sign + retry USDC| Server
    Server -->|4. verify| Indexer
    Server -->|5. validate| SLA
    Server -->|6. settle/refund| Contract
    Contract -->|7. tx id| Server
    Server -->|8. 200 + receipt| Client
    Server -.->|live events| Dashboard`;

async function fetchDiagram(def, basename) {
  const json = JSON.stringify({ code: def, mermaid: { theme: 'dark' } });
  const b64 = Buffer.from(json).toString('base64');
  
  // Fetch SVG
  const svgUrl = 'https://mermaid.ink/svg/' + b64;
  console.log('Fetching SVG:', basename);
  const svgRes = await fetch(svgUrl);
  if (svgRes.ok) {
    const svg = await svgRes.text();
    fs.writeFileSync(`docs/assets/${basename}.svg`, svg);
    console.log(`Saved docs/assets/${basename}.svg (${svg.length} bytes)`);
  }

  // Fetch PNG
  const pngUrl = 'https://mermaid.ink/img/' + b64 + '?bgColor=!333';
  console.log('Fetching PNG:', basename);
  const pngRes = await fetch(pngUrl);
  if (pngRes.ok) {
    const arrayBuffer = await pngRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(`docs/assets/${basename}.png`, buffer);
    console.log(`Saved docs/assets/${basename}.png (${buffer.length} bytes)`);
  }
}

async function main() {
  fs.mkdirSync('docs/assets', { recursive: true });
  await fetchDiagram(seq, 'sequence_diagram');
  await fetchDiagram(flow, 'architecture_flowchart');
  console.log('Clean vector SVG and PNG diagrams generated without any UI controls!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
