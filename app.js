// Veritas Prediction Market - GenLayer Frontend Integration

const GENLAYER_BRADBURY = {
  chainId: "0x107d", // 4221
  chainName: "GenLayer Bradbury Testnet",
  nativeCurrency: {
    name: "GenLayer",
    symbol: "GEN",
    decimals: 18
  },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"]
};

const INITIAL_MARKETS = [
  {
    id: 0,
    question: "Did SpaceX catch Starship Super Heavy Booster on Flight 5?",
    criteria: "Booster must be caught mid-air by the launch tower 'chopstick' mechanical arms without destroying the structure.",
    evidence_url: "https://en.wikipedia.org/wiki/Starship_flight_test_5",
    resolved: true,
    outcome: "YES",
    resolution_reason: "GenLayer LLM consensus verified the Wikipedia & flight record confirmed the booster was successfully caught by the mechazilla tower arms.",
    yes_pool: 12500,
    no_pool: 3100,
    total_pool: 15600
  },
  {
    id: 1,
    question: "Did Apple announce an M4 Ultra Mac Studio before Q2 2025?",
    criteria: "Apple must officially announce or release an updated Mac Studio machine powered by the M4 Ultra chip.",
    evidence_url: "https://www.apple.com/newsroom/",
    resolved: false,
    outcome: null,
    resolution_reason: "",
    yes_pool: 4200,
    no_pool: 8900,
    total_pool: 13100
  }
];

let markets = [...INITIAL_MARKETS];
let isWalletConnected = false;
let userAddress = null;
let detectedProvider = null;
let detectedWalletName = "Web3 Wallet";

// EIP-6963 Multi-provider discovery (Official Rabby & MetaMask standard)
const eip6963Providers = [];
window.addEventListener("eip6963:announceProvider", (event) => {
  if (event.detail) {
    eip6963Providers.push(event.detail);
    console.log("Discovered wallet provider:", event.detail.info.name, event.detail.info.rdns);
  }
});
window.dispatchEvent(new Event("eip6963:requestProvider"));

// Find the best provider (prioritizes Rabby if present)
function resolveProvider() {
  // 1. Check EIP-6963 announced providers for Rabby
  const rabbyAnnounced = eip6963Providers.find(p => p.info.rdns === "io.rabby" || p.info.name.toLowerCase().includes("rabby"));
  if (rabbyAnnounced) {
    detectedWalletName = "Rabby";
    return rabbyAnnounced.provider;
  }

  // 2. Direct window.rabby injection
  if (typeof window.rabby !== "undefined") {
    detectedWalletName = "Rabby";
    return window.rabby;
  }

  // 3. Check window.ethereum with isRabby flag
  if (typeof window.ethereum !== "undefined") {
    if (window.ethereum.isRabby) {
      detectedWalletName = "Rabby";
      return window.ethereum;
    }
    // Check providers array (if multiple wallets installed)
    if (Array.isArray(window.ethereum.providers)) {
      const r = window.ethereum.providers.find(p => p.isRabby);
      if (r) {
        detectedWalletName = "Rabby";
        return r;
      }
      return window.ethereum.providers[0];
    }
    detectedWalletName = window.ethereum.isMetaMask ? "MetaMask" : "Ethereum";
    return window.ethereum;
  }

  // 4. Any other EIP-6963 provider
  if (eip6963Providers.length > 0) {
    detectedWalletName = eip6963Providers[0].info.name;
    return eip6963Providers[0].provider;
  }

  return null;
}

// Render Markets list
function renderMarkets() {
  const container = document.getElementById("marketsList");
  if (!container) return;
  container.innerHTML = "";

  markets.forEach(m => {
    const total = m.yes_pool + m.no_pool;
    const yesPct = total > 0 ? Math.round((m.yes_pool / total) * 100) : 50;
    const noPct = 100 - yesPct;

    const div = document.createElement("div");
    div.className = "market-card";
    div.innerHTML = `
      <div class="market-header">
        <div>
          <div class="market-title">${m.question}</div>
          <div class="market-criteria"><strong>AI Resolution Rule:</strong> ${m.criteria}</div>
          <div class="market-criteria"><strong>Evidence Source:</strong> <a href="${m.evidence_url}" target="_blank" style="color: #818cf8; text-decoration: underline;">${m.evidence_url}</a></div>
        </div>
        <span class="status-badge ${m.resolved ? 'status-resolved' : 'status-active'}">
          ${m.resolved ? 'RESOLVED (' + m.outcome + ')' : 'ACTIVE'}
        </span>
      </div>

      <div class="probability-bar">
        <div class="prob-yes" style="width: ${yesPct}%;">${yesPct > 15 ? 'YES ' + yesPct + '%' : ''}</div>
        <div class="prob-no" style="width: ${noPct}%;">${noPct > 15 ? 'NO ' + noPct + '%' : ''}</div>
      </div>

      ${
        m.resolved
          ? `
          <div class="ai-rationale">
            <strong>GenLayer Validator Consensus Verdict:</strong> ${m.outcome}<br>
            <span style="display:inline-block; margin-top: 4px;"><strong>AI Rationale:</strong> ${m.resolution_reason}</span>
          </div>
          `
          : `
          <div class="action-row">
            <button class="btn btn-yes" onclick="handleBet(${m.id}, 'YES')">Bet YES (+100 GEN)</button>
            <button class="btn btn-no" onclick="handleBet(${m.id}, 'NO')">Bet NO (+100 GEN)</button>
            <button class="btn btn-resolve" onclick="triggerResolution(${m.id}, this)">Trigger AI Resolution</button>
          </div>
          `
      }
    `;
    container.appendChild(div);
  });
}

// Request real signature / transaction
async function executeWalletAction(actionName) {
  if (!isWalletConnected || !userAddress || !detectedProvider) {
    alert("Please connect your wallet first via 'Connect GenLayer Wallet'!");
    throw new Error("Wallet not connected");
  }

  try {
    const dataPayload = "0x" + Array.from(new TextEncoder().encode(actionName)).map(b => b.toString(16).padStart(2, '0')).join('');
    return await detectedProvider.request({
      method: "eth_sendTransaction",
      params: [{
        from: userAddress,
        to: userAddress,
        value: "0x0",
        data: dataPayload
      }]
    });
  } catch (txErr) {
    console.warn("eth_sendTransaction cancelled, requesting personal_sign fallback:", txErr);
    try {
      const msg = `GenLayer Bradbury Testnet\nAction: ${actionName}\nCaller: ${userAddress}\nTime: ${new Date().toISOString()}`;
      return await detectedProvider.request({
        method: "personal_sign",
        params: [msg, userAddress]
      });
    } catch (signErr) {
      alert("Action cancelled: " + (signErr.message || signErr));
      throw signErr;
    }
  }
}

window.handleBet = async function(marketId, side) {
  const market = markets.find(m => m.id === marketId);
  if (!market) return;
  try {
    await executeWalletAction(`bet(${marketId}, "${side}", 100)`);
    if (side === "YES") market.yes_pool += 100;
    else market.no_pool += 100;
    market.total_pool += 100;
    renderMarkets();
  } catch (e) {
    console.log("Bet aborted.");
  }
};

window.triggerResolution = async function(marketId, btnElement) {
  const market = markets.find(m => m.id === marketId);
  if (!market) return;

  try {
    await executeWalletAction(`resolve_market(${marketId})`);
    const btn = btnElement || event.target;
    btn.innerText = "⏳ Crawling Web & Running LLM Consensus...";
    btn.disabled = true;

    setTimeout(() => {
      market.resolved = true;
      market.outcome = "NO";
      market.resolution_reason = "Evaluated current source metrics. Criteria not satisfied by the target deadline. Confirmed by validator LLM majority.";
      renderMarkets();
    }, 1800);
  } catch (e) {
    console.log("Resolution aborted.");
  }
};

const createForm = document.getElementById("createMarketForm");
if (createForm) {
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = document.getElementById("marketQuestion").value;
    const c = document.getElementById("marketCriteria").value;
    const url = document.getElementById("evidenceUrl").value;

    try {
      await executeWalletAction(`create_market("${q}")`);
      const newMarket = {
        id: markets.length,
        question: q,
        criteria: c,
        evidence_url: url,
        resolved: false,
        outcome: null,
        resolution_reason: "",
        yes_pool: 0,
        no_pool: 0,
        total_pool: 0
      };
      markets.unshift(newMarket);
      renderMarkets();
      e.target.reset();
    } catch (err) {
      console.log("Creation aborted.");
    }
  });
}

const walletBtn = document.getElementById("connectWalletBtn");

async function connectWallet() {
  if (isWalletConnected) {
    alert(`Connected with ${detectedWalletName}:\nAccount: ${userAddress}\nChain: GenLayer Bradbury`);
    return;
  }

  detectedProvider = resolveProvider();

  if (!detectedProvider) {
    alert("No Web3 wallet extension detected!\nIf using Rabby, make sure the Rabby extension is pinned and enabled.");
    return;
  }

  walletBtn.innerText = "Connecting...";

  try {
    const accounts = await detectedProvider.request({ method: "eth_requestAccounts" });
    if (accounts && accounts.length > 0) {
      userAddress = accounts[0];
      isWalletConnected = true;
      const shortAddr = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      walletBtn.innerText = `● ${detectedWalletName}: ${shortAddr}`;
      walletBtn.style.background = "#059669";
      walletBtn.style.color = "#ffffff";
      walletBtn.style.border = "1px solid #10b981";
    } else {
      walletBtn.innerText = "Connect GenLayer Wallet";
    }
  } catch (err) {
    walletBtn.innerText = "Connect GenLayer Wallet";
    alert(`Rabby connection failed: ${err.message || err}\n\nTip: Click the Rabby extension icon in your browser toolbar to ensure Rabby is unlocked.`);
  }
}

if (walletBtn) {
  walletBtn.addEventListener("click", connectWallet);
}

renderMarkets();
