import fs from 'fs';

const seq = `sequenceDiagram
    participant Agent as AI Agent / Client
    participant Shield as SLAShield402 (Person 1)
    participant Facilitator as GoPlausible Facilitator (verify/settle)
    participant Indexer as Algorand Indexer (verification)
    participant SLA as SLA Validator (Person 2)
    participant Contract as Escrow Contract (Person 3, App #769236555)
    participant Target as Target API (simulated)

    Agent->>Shield: 1. POST /shield/check
    Shield-->>Agent: 2. 402 Payment Required (accepts array, CAIP-2, ASA 10458941)
    Note over Agent: 3. sign USDC ASA transfer (axfer)
    Agent->>Shield: 4. retry with X-Payment-Proof
    Shield->>Indexer: 5a. verify tx on-chain (Index check)
    Shield->>Facilitator: 5b. POST /verify & /settle (0.001 USDC inspection fee)
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
    Facilitator["GoPlausible Facilitator<br/>(verify & settle)"]
    Indexer["Algorand Indexer<br/>(on-chain verify)"]
    SLA["SLA Validator<br/>(Person 2)"]
    Contract["Escrow Smart Contract<br/>App #769236555"]
    Dashboard["Real-Time Dashboard<br/>(WebSocket, observability)"]

    Client -->|1. request| Server
    Server -->|2. 402 + accepts array| Client
    Client -->|3. sign + retry USDC| Server
    Server -->|4a. verify & settle fee| Facilitator
    Server -->|4b. on-chain check| Indexer
    Server -->|5. validate| SLA
    Server -->|6. settle/refund| Contract
    Contract -->|7. tx id| Server
    Server -->|8. 200 + receipt| Client
    Server -.->|live events| Dashboard`;

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) return res;
    } catch (e: any) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function fetchDiagram(def: string, basename: string) {
  const json = JSON.stringify({ code: def, mermaid: { theme: 'dark' } });
  const b64 = Buffer.from(json).toString('base64');
  
  // Fetch SVG
  const svgUrl = 'https://mermaid.ink/svg/' + b64;
  console.log('Fetching SVG:', basename);
  const svgRes = await fetchWithRetry(svgUrl);
  const svg = await svgRes.text();
  fs.writeFileSync(`docs/assets/${basename}.svg`, svg);
  console.log(`Saved docs/assets/${basename}.svg (${svg.length} bytes)`);

  // Fetch PNG
  const pngUrl = 'https://mermaid.ink/img/' + b64 + '?bgColor=!333';
  console.log('Fetching PNG:', basename);
  const pngRes = await fetchWithRetry(pngUrl);
  const buf = Buffer.from(await pngRes.arrayBuffer());
  fs.writeFileSync(`docs/assets/${basename}.png`, buf);
  console.log(`Saved docs/assets/${basename}.png (${buf.length} bytes)`);
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
