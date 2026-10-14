# Veritas Market — GenLayer Intelligent Contract Integration

Veritas Market is a decentralized prediction and truth market built natively on GenLayer. It leverages GenLayer's GenVM, Equivalence Principle, and LLM consensus to resolve complex real-world claims without centralized human oracles.

## Live Deployed Intelligent Contract
- **Contract Address (Bradbury Testnet):** `0x85Efb67368c020894704647e5D64BFc3aa163835`
- **Network:** GenLayer Bradbury Testnet (Chain ID `4221`)
- **RPC Endpoint:** `https://rpc-bradbury.genlayer.com`
- **IDE / Explorer:** [GenLayer Studio](https://studio.genlayer.com)

## Real GenLayer Integration Details
Unlike traditional smart contracts, Veritas Market directly interacts with the GenLayer consensus execution engine:
1. **Consensus-level LLM Execution:** The contract executes `gl.nondet.exec_prompt()` to analyze nuanced, subjective claim conditions against web evidence.
2. **Equivalence Principle:** Validators achieve deterministic comparative consensus using `gl.eq_principle.prompt_comparative()`.
3. **Frontend dApp Integration:** The web frontend (`index.html` + `app.js`) interacts directly with contract `0x85Efb67368c020894704647e5D64BFc3aa163835`, allowing users to place bets (`bet()`) and trigger validator consensus resolution (`resolve_market()`).

## Verification Links
- **Live dApp:** https://segzyowy.github.io/genlayer-veritas/
- **Contract Source:** [VeritasMarket.py](VeritasMarket.py)
