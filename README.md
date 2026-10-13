# GenLayer Contribution Submission: Veritas Market

## 1. Project Overview
**Veritas Market** is an autonomous, decentralized truth and prediction market platform built natively on GenLayer. It allows users to create prediction markets on nuanced, subjective, or complex real-world events that standard blockchains cannot resolve without centralized human oracles.

When a market resolves, GenLayer validator nodes autonomously fetch live web evidence from specified URLs, execute LLM prompts against user-defined natural language criteria, reach consensus via GenLayer's Equivalence Principle, and finalize payouts.

---

## 2. Why GenLayer is Central to the Workflow
Traditional prediction market protocols (e.g., Polymarket, Augur) suffer from critical limitations when handling non-binary or subjective propositions:
1. **Centralized Resolution Risk:** They rely on centralized or semi-centralized committees (like UMA or proprietary resolution councils) that are slow, prone to disputes, and expensive.
2. **Deterministic Smart Contract Limits:** Standard EVM contracts cannot access the web or comprehend nuanced natural language criteria.

**Veritas Market fundamentally requires GenLayer:**
- **On-chain Web Access (`gl.nondet.web.get`):** The contract itself crawls the evidence source URL dynamically at settlement time.
- **LLM-driven Dispute Resolution (`gl.nondet.exec_prompt`):** The contract evaluates the crawled content against the market's custom resolution criteria in plain English.
- **Comparative Consensus (`gl.vm.run_nondet_unsafe`):** GenLayer validators run non-deterministic tasks independently and validate that the output adheres to the expected format and logical standard.

Without GenLayer's Intelligent Contracts, this platform could not exist in a decentralized manner.

---

## 3. Architecture & Intelligent Contract Details

### Contract File: `contracts/VeritasMarket.py`
The contract is written in Python using GenLayer's native contract SDK:

- **`create_market(question, resolution_criteria, evidence_source_url, duration_blocks)`**:
  Registers a new prediction market with natural language criteria and a web source URL.
- **`place_bet(market_id, side, amount)`**:
  Handles YES/NO betting pool deposits.
- **`resolve_market(market_id)`**:
  The core intelligent contract method:
  1. Spawns a non-deterministic execution block to crawl `evidence_source_url`.
  2. Passes the content to `gl.nondet.exec_prompt(..., response_format="json")` alongside the market criteria.
  3. Uses a validator function to ensure consensus across nodes.
  4. Stores the verdict (`YES`, `NO`, or `UNCLEAR`) and natural-language reasoning on-chain.

---

## 4. Frontend & Application Logic
The project includes a responsive web interface (`index.html` + `app.js`) enabling users to:
1. Connect their GenLayer wallet.
2. Create customized truth markets with prompt criteria and evidence URLs.
3. Place bets on YES/NO outcomes with live visual pool distribution.
4. Trigger on-chain resolution and inspect the AI-generated reasoning returned by GenLayer validators.

---

## 5. Repository Structure
```text
.
├── contracts/
│   └── VeritasMarket.py      # GenLayer Intelligent Contract in Python
├── index.html                # Interactive Frontend Dashboard
├── app.js                    # GenLayer client integration logic
└── README.md                 # Project documentation & run guide
```

---

## 6. How to Run & Test Locally
1. **Frontend:** Open `index.html` in any modern web browser or serve via `npx serve .`
2. **Deploy Intelligent Contract:**
   Using GenLayer CLI:
   ```bash
   genlayer deploy contracts/VeritasMarket.py
   ```
