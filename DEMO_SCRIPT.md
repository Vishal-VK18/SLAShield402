# Demo Video Script: SLAShield402

**Target Duration:** 2 minutes 50 seconds  
**Live Application URL:** `http://localhost:5173` (Dashboard) / `http://localhost:3000` (Firewall API)  
**Deployed Contract:** Algorand Testnet Application ID `#769236555`

---

## 0:00 - 0:15 | The Hook
- **Visual:** Speaker on camera / Dashboard landing view showing live stats and status badge.
- **Voiceover:**
  > "Autonomous AI agents can now pay for APIs on their own using x402 on Algorand. But what stops a rogue API from charging $50 instead of 5 cents, or pocketing the payment and returning 4-hour-old stale data? We built **SLAShield402** — an intelligent payment firewall and real-time SLA escrow layer that protects agents from budget overruns and slashes provider bonds on-chain when SLAs fail."

---

## 0:15 - 0:35 | Show the Unpaid Request Failing with 402
- **Visual:** Terminal / Postman showing raw `curl -i -X POST http://localhost:3000/shield/check` without payment proof.
- **Voiceover:**
  > "Let's look at the raw protocol. When an agent requests a protected capability through SLAShield402, the server returns a genuine `HTTP/1.1 402 Payment Required` response with a standard `WWW-Authenticate` header. Look at the challenge body: it specifies the exact amount—0.001 USDC, the recipient address, and the official CAIP-2 Algorand Testnet identifier. This is authentic x402 negotiation, not a cosmetic paywall."

---

## 0:35 - 1:15 | Show Automatic Payment & Spend Policy Enforcement
- **Visual:** Split screen showing the Terminal running `npm run demo` and the React Dashboard live-updating.
- **Voiceover:**
  > "Now watch the client handle this automatically. The agent receives the 402, evaluates its spend policy, dynamically signs a fresh USDC transfer on Algorand Testnet, and retries with the payment proof attached.
  > 
  > In **Scenario 1**, the quote is $0.02, well within the agent's $1.00 budget. The firewall approves the call, executes the upstream query, and validates the response.
  > 
  > In **Scenario 2**, a rogue provider attempts a price spike of $0.50 against a $0.15 budget limit. Watch the firewall immediately return `HTTP 400 BLOCKED`. Zero target funds leave the agent's wallet."

---

## 1:15 - 1:35 | Show the Receipt & On-Chain Confirmation
- **Visual:** Zoom in on the JSON response and click the Pera Explorer link for `DWR5KCQPJMCTRNFKRJNKZE7VD6HK5YMRI2RCKAUWNMGONDVHZUTA`.
- **Voiceover:**
  > "Every approved execution produces a verifiable receipt. Here is the returned `shield_fee_tx` and `settlement_tx_id`. When we open this on the Algorand Pera Explorer, you can see the live inner transaction confirmed in round `66487818`, transferring funds to the provider. The entire flow took under 300 milliseconds of network time."

---

## 1:35 - 2:30 | Show Real Product Value: SLA Violation & Bond Slashing
- **Visual:** Dashboard and Terminal running **Scenario 3** (Stale Data SLA Violation).
- **Voiceover:**
  > "Here is our core innovation: **Scenario 3**. An agent pays for crypto oracle data, but the provider returns a stale, 4-hour-old timestamp.
  > 
  > Person 2's Outcome Validator intercepts the response and flags `Freshness: FAIL (14,400s age vs 60s max allowed)`.
  > 
  > Instead of settling, the gateway invokes our PyTeal smart contract script `refundAndPenalize.py`. On-chain transaction `KXZXOGNHT7BGUOH6JPFVFULVIOD7H6AGGVYKIVRSIWORYDSMSE4Q` executes two atomic actions:
  > 1. It **refunds the full payment back to the agent**.
  > 2. It **slashes the provider's bonded stake by 10%** in global contract state.
  > 
  > Bad actors lose their stake; the agent is made whole."

---

## 2:30 - 2:50 | The "What's Next" Beat
- **Visual:** Show `ARCHITECTURE.md` diagram and `GET /api/discovery` Bazaar catalog endpoint.
- **Voiceover:**
  > "To deploy to Mainnet, we simply point our `.env` configuration to Algorand Mainnet and Circle Mainnet USDC Asset ID `31566704`. Our architecture is fully compliant with GoPlausible Bazaar discovery standards via `GET /api/discovery`, allowing any autonomous agent crawler to discover and use our firewall."

---

## 2:50 - 3:00 | Close
- **Visual:** Dashboard Hero Screen with project logo and GitHub link.
- **Voiceover:**
  > "SLAShield402 transforms agentic payments from unprotected paywalls into trustworthy, SLA-backed micro-commerce on Algorand. Thank you!"

---

## Recording Checklist
- [x] Resolution: 1920x1080, 60fps
- [x] Real Transaction IDs shown and verified:
  - Fresh USDC Client Sign: `7DDDB4OSEYWCLBKZV23BXVUQTEBSSLIE2EALXJARQAUQ2QJCFAOQ`
  - Settle Transaction: `DWR5KCQPJMCTRNFKRJNKZE7VD6HK5YMRI2RCKAUWNMGONDVHZUTA`
  - Refund & Slash Transaction: `KXZXOGNHT7BGUOH6JPFVFULVIOD7H6AGGVYKIVRSIWORYDSMSE4Q`
- [x] Clear audio narration matching timeline.
