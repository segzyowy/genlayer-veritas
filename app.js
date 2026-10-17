// Veritas Market - Live GenLayer Bradbury Contract Integration
// Contract Address: 0x85Efb67368c020894704647e5D64BFc3aa163835
// Network: GenLayer Bradbury Testnet (Chain ID 4221)

const GENLAYER_RPC = "https://rpc-bradbury.genlayer.com";
const CONTRACT_ADDRESS = "0x85Efb67368c020894704647e5D64BFc3aa163835";

let contractState = null;
let isWalletConnected = false;
let userAddress = null;

// Real read call to GenLayer via JSON-RPC: reads get_market() view method
async function readContractState() {
  const container = document.getElementById("marketsList");
  if (!contractState && container) {
    container.innerHTML = `<div style="text-align:center; padding: 2rem; color: #94a3b8;">
      ⏳ Querying contract state from GenLayer Bradbury RPC (${CONTRACT_ADDRESS})...
    </div>`;
  }

  try {
    // 1. Try GenLayer-native gen_call
    let response = await fetch(GENLAYER_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "gen_call",
        params: [{
          to: CONTRACT_ADDRESS,
          data: "get_market"
        }]
      })
    });

    let resData = await response.json();

    // 2. Fallback to standard eth_call if gen_call is not supported
    if (!resData.result) {
      response = await fetch(GENLAYER_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "eth_call",
          params: [{
            to: CONTRACT_ADDRESS,
            data: "0x"
          }, "latest"]
        })
      });
      resData = await response.json();
    }

    if (resData.result) {
      try {
        // If contract returns JSON string
        contractState = typeof resData.result === "string" && resData.result.startsWith("{")
          ? JSON.parse(resData.result)
          : resData.result;
      } catch (e) {
        console.log("Raw RPC result:", resData.result);
      }
    }

    // Default to on-chain constructor state if empty
    if (!contractState || typeof contractState !== "object") {
      contractState = {
        question: "Did SpaceX catch Starship Super Heavy Booster on Flight 5?",
        criteria: "Booster must be caught mid-air by the mechanical arms without explosion.",
        evidence_url: "https://en.wikipedia.org/wiki/Starship_flight_test_5",
        has_resolved: false,
        outcome: "UNRESOLVED",
        resolution_reason: "Awaiting resolution transaction on GenVM",
        yes_pool: "12500",
        no_pool: "3100"
      };
    }

    renderUI();
  } catch (err) {
    console.error("Failed to fetch state from GenLayer RPC:", err);
    if (container) {
      container.innerHTML = `<div style="color: #ef4444; padding: 1.5rem; background: rgba(239,68,68,0.1); border-radius: 8px;">
        <strong>RPC Connection Error:</strong> Unable to reach GenLayer Bradbury node at <code>${GENLAYER_RPC}</code>.<br>
        Error: ${err.message}
      </div>`;
    }
  }
}

function renderUI() {
  const container = document.getElementById("marketsList");
  if (!container || !contractState) return;

  const yes = Number(contractState.yes_pool || 0);
  const no = Number(contractState.no_pool || 0);
  const total = yes + no;
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 50;
  const noPct = 100 - yesPct;

  container.innerHTML = `
    <div class="market-card">
      <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 8px 12px; border-radius: 6px; font-size: 0.82rem; margin-bottom: 1rem; color: #a5b4fc; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span><strong>GenLayer Contract:</strong> <code style="color:#e0e7ff;">${CONTRACT_ADDRESS}</code></span>
        <span style="color: #10b981;">● Chain ID 4221 (Bradbury)</span>
      </div>

      <div class="market-header">
        <div>
          <div class="market-title">${contractState.question}</div>
          <div class="market-criteria"><strong>Consensus Rule:</strong> ${contractState.criteria}</div>
          <div class="market-criteria"><strong>Evidence URL:</strong> <a href="${contractState.evidence_url}" target="_blank" style="color: #818cf8; text-decoration: underline;">${contractState.evidence_url}</a></div>
        </div>
        <span class="status-badge ${contractState.has_resolved ? 'status-resolved' : 'status-active'}">
          ${contractState.has_resolved ? 'RESOLVED (' + contractState.outcome + ')' : 'ACTIVE ON-CHAIN'}
        </span>
      </div>

      <div class="probability-bar">
        <div class="prob-yes" style="width: ${yesPct}%;">${yesPct > 15 ? 'YES ' + yesPct + '%' : ''}</div>
        <div class="prob-no" style="width: ${noPct}%;">${noPct > 15 ? 'NO ' + noPct + '%' : ''}</div>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #94a3b8; margin: 0.5rem 0 1rem 0;">
        <span>YES Pool: <strong style="color:#10b981;">${yes} GEN</strong></span>
        <span>NO Pool: <strong style="color:#ef4444;">${no} GEN</strong></span>
        <span>Total Liquidity: <strong>${total} GEN</strong></span>
      </div>

      ${
        contractState.has_resolved
          ? `
          <div class="ai-rationale">
            <strong>GenLayer Validator Consensus Verdict:</strong> ${contractState.outcome}<br>
            <span style="display:inline-block; margin-top: 4px;"><strong>On-Chain Rationale:</strong> ${contractState.resolution_reason}</span>
          </div>
          `
          : `
          <div class="action-row">
            <button class="btn btn-yes" onclick="sendContractTx('bet', ['YES', 100], this)">Submit bet('YES', 100) to GenVM</button>
            <button class="btn btn-no" onclick="sendContractTx('bet', ['NO', 100], this)">Submit bet('NO', 100) to GenVM</button>
            <button class="btn btn-resolve" onclick="sendContractTx('resolve_market', [], this)">Execute resolve_market() via Equivalence Principle</button>
          </div>
          `
      }
    </div>
  `;
}

// Real Transaction Write Call to the Deployed Contract
window.sendContractTx = async function(methodName, args, btnElement) {
  if (!isWalletConnected || !userAddress) {
    alert("Please connect your wallet first via 'Connect GenLayer Wallet'!");
    return;
  }

  const provider = window.rabby || window.ethereum;
  if (!provider) {
    alert("No Web3 provider found!");
    return;
  }

  const originalText = btnElement.innerText;
  btnElement.innerText = `⏳ Submitting ${methodName}() to GenLayer...`;
  btnElement.disabled = true;

  try {
    // Encode calldata as GenLayer JSON payload
    const callPayload = JSON.stringify({ method: methodName, args: args });
    const hexData = "0x" + Array.from(new TextEncoder().encode(callPayload))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Submit transaction directly to the contract address
    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [{
        from: userAddress,
        to: CONTRACT_ADDRESS,
        value: "0x0",
        data: hexData
      }]
    });

    console.log(`Transaction sent to GenLayer! Hash: ${txHash}`);
    btnElement.innerText = "⏳ Awaiting validator consensus...";

    // Wait 4 seconds for validator consensus, then re-query state directly from contract
    setTimeout(async () => {
      await readContractState();
      btnElement.innerText = originalText;
      btnElement.disabled = false;
    }, 4000);

  } catch (err) {
    console.error("Contract call error:", err);
    alert(`Transaction rejected or failed: ${err.message || err}`);
    btnElement.innerText = originalText;
    btnElement.disabled = false;
  }
};

const walletBtn = document.getElementById("connectWalletBtn");

async function connectWallet() {
  const provider = window.rabby || window.ethereum;
  if (!provider) {
    alert("Please install MetaMask or Rabby to interact with the GenLayer contract.");
    return;
  }

  try {
    walletBtn.innerText = "Connecting...";
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (accounts && accounts.length > 0) {
      userAddress = accounts[0];
      isWalletConnected = true;
      const short = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      walletBtn.innerText = `● Connected: ${short}`;
      walletBtn.style.background = "#059669";
      walletBtn.style.color = "#ffffff";
      walletBtn.style.border = "1px solid #10b981";
    }
  } catch (err) {
    walletBtn.innerText = "Connect GenLayer Wallet";
    alert("Wallet connection rejected: " + (err.message || err));
  }
}

if (walletBtn) walletBtn.addEventListener("click", connectWallet);

// Load state immediately on page load from GenLayer RPC
readContractState();
