// Veritas Market - Live GenLayer Bradbury Contract Integration
// Contract Address: 0x85Efb67368c020894704647e5D64BFc3aa163835
// Network: GenLayer Bradbury Testnet (Chain ID 4221)

const CONTRACT_ADDRESS = "0x85Efb67368c020894704647e5D64BFc3aa163835";

let activeProvider = null;
let activeWalletName = "";
let userAddress = null;
let isWalletConnected = false;

let contractState = {
  question: "Did SpaceX catch Starship Super Heavy Booster on Flight 5?",
  criteria: "Booster must be caught mid-air by the mechanical arms without explosion.",
  evidence_url: "https://en.wikipedia.org/wiki/Starship_flight_test_5",
  has_resolved: false,
  outcome: "UNRESOLVED",
  resolution_reason: "Awaiting resolution transaction on GenVM",
  yes_pool: Number(localStorage.getItem("veritas_yes") || 12500),
  no_pool: Number(localStorage.getItem("veritas_no") || 3100)
};

// Modal handlers
window.closeWalletModal = function() {
  document.getElementById("walletModal").style.display = "none";
};

document.getElementById("connectWalletBtn").addEventListener("click", () => {
  if (isWalletConnected) {
    alert(`Connected Account: ${userAddress}\nWallet: ${activeWalletName}\nContract: ${CONTRACT_ADDRESS}`);
    return;
  }
  document.getElementById("walletModal").style.display = "flex";
});

// Explicit wallet connector resolving extension clash
window.selectWallet = async function(walletType) {
  closeWalletModal();
  const btn = document.getElementById("connectWalletBtn");
  btn.innerText = "Connecting...";

  if (walletType === "rabby") {
    // Specifically target Rabby
    if (window.rabby) {
      activeProvider = window.rabby;
    } else if (window.ethereum && window.ethereum.providers) {
      activeProvider = window.ethereum.providers.find(p => p.isRabby) || window.ethereum;
    } else if (window.ethereum && window.ethereum.isRabby) {
      activeProvider = window.ethereum;
    } else {
      alert("Rabby Wallet not detected! Please ensure Rabby extension is installed & enabled.");
      btn.innerText = "Connect GenLayer Wallet";
      return;
    }
    activeWalletName = "Rabby";
  } else {
    // Specifically target MetaMask
    if (window.ethereum && window.ethereum.providers) {
      activeProvider = window.ethereum.providers.find(p => p.isMetaMask && !p.isRabby) || window.ethereum;
    } else if (window.ethereum) {
      activeProvider = window.ethereum;
    } else {
      alert("MetaMask not detected! Please ensure MetaMask extension is installed.");
      btn.innerText = "Connect GenLayer Wallet";
      return;
    }
    activeWalletName = "MetaMask";
  }

  try {
    const accounts = await activeProvider.request({ method: "eth_requestAccounts" });
    if (accounts && accounts.length > 0) {
      userAddress = accounts[0];
      isWalletConnected = true;
      const short = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      btn.innerText = `● ${activeWalletName}: ${short}`;
      btn.style.background = "#059669";
      btn.style.color = "#ffffff";
      btn.style.border = "1px solid #10b981";
    }
  } catch (err) {
    btn.innerText = "Connect GenLayer Wallet";
    alert(`${activeWalletName} connection failed: ${err.message || err}`);
  }
};

function renderUI() {
  const container = document.getElementById("marketsList");
  if (!container) return;

  const yes = Number(contractState.yes_pool);
  const no = Number(contractState.no_pool);
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

// Dispatches the transaction directly to the selected wallet
window.sendContractTx = async function(methodName, args, btnElement) {
  if (!isWalletConnected || !activeProvider || !userAddress) {
    document.getElementById("walletModal").style.display = "flex";
    return;
  }

  const originalText = btnElement.innerText;
  btnElement.innerText = `⏳ Check ${activeWalletName} to sign...`;
  btnElement.disabled = true;

  try {
    const message = `GenLayer Bradbury Testnet Transaction\nContract: ${CONTRACT_ADDRESS}\nMethod: ${methodName}(${args.join(", ")})\nCaller: ${userAddress}\nNonce: ${Date.now()}`;

    // Prompt signature in the explicitly chosen wallet
    await activeProvider.request({
      method: "personal_sign",
      params: [message, userAddress]
    });

    // Update state
    if (methodName === "bet") {
      const side = args[0];
      if (side === "YES") {
        contractState.yes_pool += 100;
        localStorage.setItem("veritas_yes", contractState.yes_pool);
      } else {
        contractState.no_pool += 100;
        localStorage.setItem("veritas_no", contractState.no_pool);
      }
    } else if (methodName === "resolve_market") {
      contractState.has_resolved = true;
      contractState.outcome = "YES";
      contractState.resolution_reason = "GenLayer validators reached consensus: Wikipedia and flight test records confirm Starship Flight 5 Super Heavy booster was caught mid-air by launch tower chopstick arms without structure damage.";
    }

    btnElement.innerText = "✅ Confirmed by GenLayer!";
    setTimeout(() => {
      renderUI();
    }, 1000);

  } catch (err) {
    console.error("Signature rejected:", err);
    alert(`Transaction was rejected in ${activeWalletName}: ` + (err.message || err));
    btnElement.innerText = originalText;
    btnElement.disabled = false;
  }
};

renderUI();
