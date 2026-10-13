// Veritas Prediction Market - GenLayer Frontend Integration

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
let connectedAccount = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

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
          <h3 class="market-title">${m.question}</h3>
          <p class="market-desc">${m.criteria}</p>
        </div>
        ${
          m.resolved
            ? `<span class="resolved-pill resolved-${m.outcome.toLowerCase()}">Resolved: ${m.outcome}</span>`
            : `<span style="font-size: 0.8rem; color: #10b981; font-weight: 600;">ACTIVE</span>`
        }
      </div>

      <div class="evidence-box">
        <strong>Evidence Source:</strong> <a href="${m.evidence_url}" target="_blank" style="color: inherit; text-decoration: underline;">${m.evidence_url}</a>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
        <span style="color: var(--yes-color); font-weight: 600;">YES: ${yesPct}% (${m.yes_pool} GEN)</span>
        <span style="color: var(--no-color); font-weight: 600;">NO: ${noPct}% (${m.no_pool} GEN)</span>
      </div>

      <div class="pool-bars">
        <div class="bar-yes" style="width: ${yesPct}%"></div>
        <div class="bar-no" style="width: ${noPct}%"></div>
      </div>

      ${
        m.resolved
          ? `<div class="reason-box"><strong>GenLayer Arbiter Reason:</strong> ${m.resolution_reason}</div>`
          : `
          <div class="market-actions">
            <div>
              <button class="bet-btn bet-yes" onclick="handleBet(${m.id}, 'YES')">Bet YES (+100)</button>
              <button class="bet-btn bet-no" onclick="handleBet(${m.id}, 'NO')">Bet NO (+100)</button>
            </div>
            <button class="resolve-btn" onclick="triggerResolution(${m.id})">Trigger GenLayer Resolution</button>
          </div>
          `
      }
    `;
    container.appendChild(div);
  });
}

window.handleBet = function(marketId, side) {
  const market = markets.find(m => m.id === marketId);
  if (!market) return;
  if (side === "YES") market.yes_pool += 100;
  else market.no_pool += 100;
  market.total_pool += 100;
  renderMarkets();
};

window.triggerResolution = async function(marketId) {
  const market = markets.find(m => m.id === marketId);
  if (!market) return;

  const btn = event.target;
  btn.innerText = "Crawling Web & Running LLM Consensus...";
  btn.disabled = true;

  // Simulate GenLayer transaction call to `resolve_market(marketId)`
  setTimeout(() => {
    market.resolved = true;
    market.outcome = "NO";
    market.resolution_reason = "Evaluated current Apple Newsroom listings. No official announcement or press release for M4 Ultra Mac Studio has been published to date.";
    renderMarkets();
  }, 1800);
};

document.getElementById("createMarketForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("marketQuestion").value;
  const c = document.getElementById("marketCriteria").value;
  const url = document.getElementById("evidenceUrl").value;

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
  alert("Market submitted to GenLayer Intelligent Contract!");
});

document.getElementById("connectWalletBtn").addEventListener("click", () => {
  alert(`Connected to GenLayer Testnet: ${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)}`);
});

// Initial Render
renderMarkets();
