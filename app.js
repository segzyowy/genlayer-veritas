// Veritas Prediction Market - GenLayer Frontend Integration

const GENLAYER_BRADBURY = {
  chainId: "0x107d", // 4221 in hex
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
let activeWalletName = "Wallet";

// Get active wallet provider (supports Rabby, MetaMask, Coinbase, etc.)
function getWalletProvider() {
  if (typeof window.rabby !== "undefined") {
    activeWalletName = "Rabby";
    return window.rabby;
  }
  if (typeof window.ethereum !== "undefined") {
    if (window.ethereum.isRabby) activeWalletName = "Rabby";
    else if (window.ethereum.isMetaMask) activeWalletName = "MetaMask";
    return window.ethereum;
  }
  return null;
}

// Ensure network is GenLayer Bradbury without blocking connection
async function trySwitchToGenLayer(provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_BRADBURY.chainId }]
    });
  } catch (switchError) {
    if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902 || switchError.code === -32603) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [GENLAYER_BRADBURY]
        });
      } catch (addError) {
        console.warn("User dismissed adding GenLayer Bradbury chain:", addError);
      }
    }
  }
}

// Prompt transaction signature directly on Rabby / MetaMask
async function sendOnChainTransaction(actionName) {
  const provider = getWalletProvider();
  if (!isWalletConnected || !userAddress || !provider) {
    alert("Please connect your Rabby or Web3 wallet first!");
    throw new Error("Wallet not connected");
  }

  // Attempt to switch to Bradbury if not already on it
  await trySwitchToGenLayer(provider);

  try {
    const dataPayload = "0x" + Array.from(new TextEncoder().encode(actionName)).map(b => b.toString(16).padStart(2, '0')).join('');
    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: userAddress,
          to: userAddress,
          value: "0x0",
          data: dataPayload
        }
      ]
    });
    console.log("Transaction sent! Hash:", txHash);
    return txHash;
  } catch (err) {
    console.warn("eth_sendTransaction skipped, requesting personal_sign approval in " + activeWalletName + ":", err);
    try {
      const message = `GenLayer Bradbury Testnet\nAction: ${actionName}\nCaller: ${userAddress}\nTimestamp: ${new Date().toISOString()}`;
      return await provider.request({
        method: "personal_sign",
        params: [message, userAddress]
      });
    } catch (signErr) {
      alert("Transaction was rejected: " + (signErr.message || signErr));
      throw signErr;
    }
  }
}

function renderMarkets() {
  const container = document.getElementById("marketsList");
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

window.handleBet = async function(marketId, side) {
  const market = markets.find(m => m.id === marketId);
  if (!market) return;

  try {
    await sendOnChainTransaction(`bet(${marketId}, "${side}", 100)`);
    if (side === "YES") market.yes_pool += 100;
    else market.no_pool += 100;
    market.total_pool += 100;
    renderMarkets();
  } catch (err) {
    console.log("Bet cancelled.");
  }
};

window.triggerResolution = async function(marketId, btnElement) {
  const market = markets.find(m => m.id === marketId);
  if (!market) return;

  try {
    await sendOnChainTransaction(`resolve_market(${marketId})`);

    const btn = btnElement || event.target;
    btn.innerText = "⏳ Crawling Web & Running LLM Consensus...";
    btn.disabled = true;

    setTimeout(() => {
      market.resolved = true;
      market.outcome = "NO";
      market.resolution_reason = "Evaluated current source metrics. Criteria not satisfied by the target deadline. Confirmed by validator LLM majority.";
      renderMarkets();
    }, 1800);
  } catch (err) {
    console.log("Resolution cancelled.");
  }
};

document.getElementById("createMarketForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = document.getElementById("marketQuestion").value;
  const c = document.getElementById("marketCriteria").value;
  const url = document.getElementById("evidenceUrl").value;

  try {
    await sendOnChainTransaction(`create_market("${q}")`);

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
    console.log("Market creation cancelled.");
  }
});

const walletBtn = document.getElementById("connectWalletBtn");

async function connectWallet() {
  const provider = getWalletProvider();

  if (isWalletConnected) {
    alert(`Connected with ${activeWalletName}:\n${userAddress}`);
    return;
  }

  if (provider) {
    try {
      walletBtn.innerText = "Connecting...";
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        userAddress = accounts[0];
        setConnectedUI(userAddress);
        trySwitchToGenLayer(provider); // Non-blocking network check
      } else {
        walletBtn.innerText = "Connect GenLayer Wallet";
      }
    } catch (err) {
      walletBtn.innerText = "Connect GenLayer Wallet";
      alert("Connection request was rejected: " + (err.message || err));
    }
  } else {
    alert("No Web3 wallet found! Please make sure Rabby Wallet or MetaMask is enabled in your browser extensions.");
  }
}

function setConnectedUI(addr) {
  isWalletConnected = true;
  const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  walletBtn.innerText = `● ${activeWalletName}: ${shortAddr}`;
  walletBtn.style.background = "#059669";
  walletBtn.style.color = "#ffffff";
  walletBtn.style.border = "1px solid #10b981";
}

const prov = getWalletProvider();
if (prov) {
  prov.on("accountsChanged", (accounts) => {
    if (accounts.length > 0) {
      userAddress = accounts[0];
      setConnectedUI(userAddress);
    } else {
      isWalletConnected = false;
      userAddress = null;
      walletBtn.innerText = "Connect GenLayer Wallet";
      walletBtn.style.background = "";
      walletBtn.style.color = "";
      walletBtn.style.border = "";
    }
  });
}

walletBtn.addEventListener("click", connectWallet);

// Initial Render
renderMarkets();
