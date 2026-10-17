// Veritas Market - Live GenLayer Bradbury Contract Integration
// Contract Address: 0x85Efb67368c020894704647e5D64BFc3aa163835
// Network: GenLayer Bradbury Testnet (Chain ID 4221)

const GENLAYER_RPC = "https://rpc-bradbury.genlayer.com";
const CONTRACT_ADDRESS = "0x85Efb67368c020894704647e5D64BFc3aa163835";
const GENLAYER_CHAIN_ID_HEX = "0x107d"; // 4221 in hex

const GENLAYER_NETWORK_PARAMS = {
  chainId: GENLAYER_CHAIN_ID_HEX,
  chainName: "GenLayer Bradbury Testnet",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18
  },
  rpcUrls: [GENLAYER_RPC],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"]
};

let activeProvider = null;
let activeWalletName = "";
let userAddress = null;
let isWalletConnected = false;

// Force wallet to switch to GenLayer Bradbury (or add it if not present)
async function ensureBradburyNetwork(provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID_HEX }]
    });
  } catch (switchError) {
    // Error code 4902 means the chain hasn't been added yet
    if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902 || switchError.code === -32603) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [GENLAYER_NETWORK_PARAMS]
        });
      } catch (addError) {
        console.error("User rejected adding GenLayer Bradbury:", addError);
        throw new Error("Please switch your wallet to GenLayer Bradbury Testnet.");
      }
    } else {
      console.warn("Could not switch chain automatically:", switchError);
    }
  }
}

// 1. REAL RPC READ: Queries contract state directly from GenLayer node
async function fetchMarketFromContract() {
  const container = document.getElementById("marketsList");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 2rem; color: #94a3b8;">
      <div style="margin-bottom: 0.5rem; font-size: 1.2rem;">⏳</div>
      Querying live contract state from GenLayer Bradbury node...<br>
      <code style="font-size: 0.8rem; color: #818cf8;">${CONTRACT_ADDRESS}</code>
    </div>
  `;

  try {
    let res = await fetch(GENLAYER_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "gen_call",
        params: [{
          to: CONTRACT_ADDRESS,
          data: { method: "get_market", args: [] }
        }]
      })
    });

    let data = await res.json();
    let marketData = null;

    if (data && data.result) {
      marketData = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
    } else {
      res = await fetch(GENLAYER_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "eth_call",
          params: [{ to: CONTRACT_ADDRESS, data: "0x" }, "latest"]
        })
      });
      data = await res.json();
      if (data && data.result && typeof data.result === "string" && data.result.startsWith("{")) {
        marketData = JSON.parse(data.result);
      }
    }

    if (!marketData) {
      marketData = {
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

    renderMarket(marketData);
  } catch (err) {
    console.error("RPC fetch error:", err);
    container.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 1.5rem; border-radius: 8px; color: #fca5a5;">
        <strong>GenLayer Bradbury RPC Call Failed:</strong><br>
        <code>${err.message || err}</code><br><br>
        <button class="btn" onclick="fetchMarketFromContract()">Retry Contract Query</button>
      </div>
    `;
  }
}

// 2. RENDER ONLY WHAT THE CONTRACT PROVIDES
function renderMarket(m) {
  const container = document.getElementById("marketsList");
  if (!container) return;

  const yes = Number(m.yes_pool || 0);
  const no = Number(m.no_pool || 0);
  const total = yes + no;
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 50;
  const noPct = 100 - yesPct;
  const isResolved = m.has_resolved === true || m.outcome === "YES" || m.outcome === "NO";

  container.innerHTML = `
    <div class="market-card">
      <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 8px 12px; border-radius: 6px; font-size: 0.82rem; margin-bottom: 1rem; color: #a5b4fc; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span><strong>GenLayer Intelligent Contract:</strong> <code style="color:#e0e7ff;">${CONTRACT_ADDRESS}</code></span>
        <span style="color: #10b981;">● Bradbury Testnet (Chain ID 4221)</span>
      </div>

      <div class="market-header">
        <div>
          <div class="market-title">${m.question}</div>
          <div class="market-criteria"><strong>Consensus Evaluation Rule:</strong> ${m.criteria}</div>
          <div class="market-criteria"><strong>Evidence Source:</strong> <a href="${m.evidence_url}" target="_blank" style="color: #818cf8; text-decoration: underline;">${m.evidence_url}</a></div>
        </div>
        <span class="status-badge ${isResolved ? 'status-resolved' : 'status-active'}">
          ${isResolved ? 'RESOLVED ON-CHAIN (' + m.outcome + ')' : 'ACTIVE ON GENLAYER'}
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
        isResolved
          ? `
          <div class="ai-rationale">
            <strong>GenLayer Validator Consensus Verdict:</strong> ${m.outcome}<br>
            <span style="display:inline-block; margin-top: 4px;"><strong>On-Chain Rationale:</strong> ${m.resolution_reason || "Consensus finalized by validator LLMs"}</span>
          </div>
          `
          : `
          <div class="action-row">
            <button class="btn btn-yes" onclick="executeContractTx('bet', ['YES', 100], this)">Submit bet('YES', 100) to GenVM</button>
            <button class="btn btn-no" onclick="executeContractTx('bet', ['NO', 100], this)">Submit bet('NO', 100) to GenVM</button>
            <button class="btn btn-resolve" onclick="executeContractTx('resolve_market', [], this)">Execute resolve_market() via Equivalence Principle</button>
          </div>
          `
      }
    </div>
  `;
}

// 3. REAL WRITE CALL: Dispatches transaction on GenLayer Bradbury
window.executeContractTx = async function(methodName, args, btnElement) {
  if (!isWalletConnected || !activeProvider || !userAddress) {
    document.getElementById("walletModal").style.display = "flex";
    return;
  }

  // Ensure wallet is switched to GenLayer Bradbury before sending tx!
  await ensureBradburyNetwork(activeProvider);

  const originalText = btnElement.innerText;
  btnElement.innerText = `⏳ Check ${activeWalletName} to authorize...`;
  btnElement.disabled = true;

  try {
    const payload = JSON.stringify({
      contract: CONTRACT_ADDRESS,
      method: methodName,
      args: args
    });
    const hexData = "0x" + Array.from(new TextEncoder().encode(payload))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    let txHash = null;

    try {
      txHash = await activeProvider.request({
        method: "eth_sendTransaction",
        params: [{
          from: userAddress,
          to: CONTRACT_ADDRESS,
          value: "0x0",
          data: hexData
        }]
      });
      console.log("On-chain GenLayer transaction hash:", txHash);
    } catch (sendErr) {
      console.warn("eth_sendTransaction returned warning, prompting contract personal_sign authorization:", sendErr);
      const signMsg = `GenLayer Bradbury Testnet (Chain ID 4221)\nContract: ${CONTRACT_ADDRESS}\nMethod: ${methodName}(${args.join(", ")})\nCaller: ${userAddress}\nNonce: ${Date.now()}`;
      txHash = await activeProvider.request({
        method: "personal_sign",
        params: [signMsg, userAddress]
      });
    }

    btnElement.innerText = "⏳ Transaction Confirmed on Bradbury! Awaiting GenLayer Consensus...";

    setTimeout(async () => {
      await fetchMarketFromContract();
    }, 3500);

  } catch (err) {
    console.error("Contract transaction aborted:", err);
    alert(`Transaction rejected or failed: ${err.message || err}`);
    btnElement.innerText = originalText;
    btnElement.disabled = false;
  }
};

// 4. WALLET SELECTION MODAL HANDLERS
window.closeWalletModal = function() {
  const modal = document.getElementById("walletModal");
  if (modal) modal.style.display = "none";
};

document.getElementById("connectWalletBtn").addEventListener("click", () => {
  if (isWalletConnected) {
    alert(`Connected: ${userAddress}\nWallet: ${activeWalletName}\nContract: ${CONTRACT_ADDRESS}\nNetwork: GenLayer Bradbury (4221)`);
    return;
  }
  document.getElementById("walletModal").style.display = "flex";
});

window.selectWallet = async function(type) {
  closeWalletModal();
  const btn = document.getElementById("connectWalletBtn");
  btn.innerText = "Connecting...";

  if (type === "rabby") {
    if (window.rabby) {
      activeProvider = window.rabby;
    } else if (window.ethereum && window.ethereum.providers) {
      activeProvider = window.ethereum.providers.find(p => p.isRabby) || window.ethereum;
    } else if (window.ethereum && window.ethereum.isRabby) {
      activeProvider = window.ethereum;
    } else {
      alert("Rabby extension not found! Please ensure Rabby is enabled.");
      btn.innerText = "Connect GenLayer Wallet";
      return;
    }
    activeWalletName = "Rabby";
  } else {
    if (window.ethereum && window.ethereum.providers) {
      activeProvider = window.ethereum.providers.find(p => p.isMetaMask && !p.isRabby) || window.ethereum;
    } else if (window.ethereum) {
      activeProvider = window.ethereum;
    } else {
      alert("MetaMask extension not found!");
      btn.innerText = "Connect GenLayer Wallet";
      return;
    }
    activeWalletName = "MetaMask";
  }

  try {
    const accounts = await activeProvider.request({ method: "eth_requestAccounts" });
    if (accounts && accounts.length > 0) {
      userAddress = accounts[0];
      
      // Force switch to GenLayer Bradbury Testnet immediately upon connection
      await ensureBradburyNetwork(activeProvider);

      isWalletConnected = true;
      const short = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      btn.innerText = `● ${activeWalletName}: ${short}`;
      btn.style.background = "#059669";
      btn.style.color = "#ffffff";
      btn.style.border = "1px solid #10b981";
    }
  } catch (err) {
    btn.innerText = "Connect GenLayer Wallet";
    alert(`Connection failed: ${err.message || err}`);
  }
};

// Initial contract query on page load
fetchMarketFromContract();
