const defaultUniverse = [
  { ticker: "SPY", name: "US Equity ETF", color: "#17365d", type: "ETF" },
  { ticker: "QQQ", name: "Growth Equity ETF", color: "#137c78", type: "ETF" },
  { ticker: "VOO", name: "Vanguard S&P 500 ETF", color: "#2e8b57", type: "ETF" },
  { ticker: "BND", name: "Total Bond Market ETF", color: "#475467", type: "ETF" },
  { ticker: "TLT", name: "Long Treasuries ETF", color: "#6b5ca5", type: "ETF" },
  { ticker: "SGOV", name: "Short Treasury ETF", color: "#486581", type: "ETF" },
  { ticker: "GLD", name: "Gold ETF", color: "#b7791f", type: "ETF" },
  { ticker: "SCHD", name: "Dividend Equity ETF", color: "#3c6e71", type: "ETF" },
  { ticker: "VXUS", name: "Total International ETF", color: "#0e7490", type: "ETF" },
  { ticker: "SMH", name: "Semiconductor ETF", color: "#7c3aed", type: "ETF" },
  { ticker: "AGQ", name: "Ultra Silver ETF", color: "#64748b", type: "ETF" },
  { ticker: "SLV", name: "Silver Trust ETF", color: "#94a3b8", type: "ETF" },
  { ticker: "SIL", name: "Global Silver Miners ETF", color: "#475569", type: "ETF" },
  { ticker: "SPCX", name: "SPAC ETF", color: "#7f1d1d", type: "ETF" },
  { ticker: "VNQ", name: "Real Estate ETF", color: "#9b3d3d", type: "ETF" },
  { ticker: "EFA", name: "International Equity ETF", color: "#3c6e71", type: "ETF" },
  { ticker: "AAPL", name: "Apple", color: "#0f766e", type: "Stock" },
  { ticker: "MSFT", name: "Microsoft", color: "#2563eb", type: "Stock" },
  { ticker: "NVDA", name: "NVIDIA", color: "#16a34a", type: "Stock" },
  { ticker: "TSLA", name: "Tesla", color: "#b42318", type: "Stock" },
  { ticker: "ASML", name: "ASML Holding", color: "#0f766e", type: "Stock" },
  { ticker: "SPHR", name: "Sphere Entertainment", color: "#8b5cf6", type: "Stock" },
  { ticker: "ANET", name: "Arista Networks", color: "#0891b2", type: "Stock" },
  { ticker: "AMZN", name: "Amazon", color: "#ea580c", type: "Stock" },
  { ticker: "META", name: "Meta", color: "#7c3aed", type: "Stock" },
  { ticker: "GOOGL", name: "Alphabet", color: "#dc2626", type: "Stock" },
  { ticker: "JPM", name: "JPMorgan Chase", color: "#334155", type: "Stock" },
  { ticker: "GS", name: "Goldman Sachs", color: "#8a6f2a", type: "Stock" },
  { ticker: "BLK", name: "BlackRock", color: "#111827", type: "Stock" },
  { ticker: "BRK-B", name: "Berkshire Hathaway", color: "#64748b", type: "Stock" },
];

const state = {
  confidence: 0.95,
  lookback: 756,
  liveMode: false,
  symbolsSource: "Local fallback list",
  dataSource: "Saved local market-data.js",
  preset: "sample",
  brokerValue: 0,
  holdings: [
    { ticker: "SPY", shares: 10 },
    { ticker: "QQQ", shares: 4 },
    { ticker: "BND", shares: 20 },
    { ticker: "GLD", shares: 3 },
    { ticker: "NVDA", shares: 2 },
  ],
};

const tradingDays = 252;
const riskFreeRate = 0.02;
const scenarioTickers = ["SPY", "TLT", "IEF", "BIL", "GLD", "XLV", "XLF"];
const apiBase = window.location.protocol === "file:" ? "http://127.0.0.1:8082" : "";
let universe = [...defaultUniverse];
let market = emptyMarket();
let latestAnalysis = null;

const elements = {
  allocations: document.getElementById("allocations"),
  tickerList: document.getElementById("tickerList"),
  portfolioPreset: document.getElementById("portfolioPreset"),
  portfolioValue: document.getElementById("portfolioValue"),
  brokerValue: document.getElementById("brokerValue"),
  brokerSync: document.getElementById("brokerSync"),
  confidence: document.getElementById("confidence"),
  lookback: document.getElementById("lookback"),
  annualReturn: document.getElementById("annualReturn"),
  annualVol: document.getElementById("annualVol"),
  sharpe: document.getElementById("sharpe"),
  maxDrawdown: document.getElementById("maxDrawdown"),
  varMetric: document.getElementById("varMetric"),
  cvarMetric: document.getElementById("cvarMetric"),
  sampleRange: document.getElementById("sampleRange"),
  dataSource: document.getElementById("dataSource"),
  memoPanel: document.getElementById("memoPanel"),
  memoContent: document.getElementById("memoContent"),
  recommendations: document.getElementById("recommendations"),
  rebalanceLab: document.getElementById("rebalanceLab"),
  stressTests: document.getElementById("stressTests"),
  correlationMatrix: document.getElementById("correlationMatrix"),
};

async function init() {
  elements.dataSource.textContent = "Loading ticker universe and market data...";
  wireControls();
  await loadSymbols();
  renderTickerList();
  await loadMarketDataForHoldings();
  renderHoldings();
  update();
}

function wireControls() {
  elements.portfolioPreset.addEventListener("change", async (event) => {
    state.preset = event.target.value;
    await applyPreset(state.preset);
  });

  elements.confidence.addEventListener("change", (event) => {
    state.confidence = Number(event.target.value);
    update();
  });

  elements.lookback.addEventListener("change", (event) => {
    state.lookback = Number(event.target.value);
    update();
  });

  elements.brokerValue.addEventListener("input", (event) => {
    state.brokerValue = Number(event.target.value) || 0;
    update();
  });

  document.getElementById("rebalanceBtn").addEventListener("click", addHolding);
  document.getElementById("resetBtn").addEventListener("click", resetHoldings);
  document.getElementById("reportBtn").addEventListener("click", exportMemo);
  document.getElementById("printMemoBtn").addEventListener("click", () => window.print());
}

async function loadSymbols() {
  try {
    const response = await fetch(`${apiBase}/api/symbols`);
    if (!response.ok) throw new Error("Symbol API unavailable");
    const payload = await response.json();
    universe = payload.symbols.map((item, index) => ({
      ...item,
      color: colorForIndex(index),
    }));
    state.liveMode = true;
    state.symbolsSource = payload.source;
  } catch {
    universe = [...defaultUniverse];
    state.liveMode = false;
    state.symbolsSource = "Local fallback list";
  }
}

function renderTickerList() {
  const popular = ["SPY", "QQQ", "VOO", "BND", "GLD", "TLT", "SGOV", "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "JPM", "GS", "BLK", "BRK-B", "VXUS", "SCHD", "SMH"];
  const ordered = [
    ...popular.map((ticker) => universe.find((item) => item.ticker === ticker)).filter(Boolean),
    ...universe.filter((item) => !popular.includes(item.ticker)).slice(0, 5000),
  ];
  elements.tickerList.innerHTML = ordered
    .map((asset) => `<option value="${asset.ticker}">${asset.name || asset.type}</option>`)
    .join("");
}

async function loadMarketDataForHoldings() {
  const tickers = [...new Set([...state.holdings.map((holding) => holding.ticker.toUpperCase()), ...scenarioTickers])];
  if (state.liveMode) {
    try {
      const response = await fetch(`${apiBase}/api/market-data?tickers=${encodeURIComponent(tickers.join(","))}`);
      if (!response.ok) throw new Error("Market data API unavailable");
      const payload = await response.json();
      market = prepareMarketDataFromApi(payload);
      state.dataSource = payload.source;
      return;
    } catch (error) {
      state.dataSource = `Live fetch failed; using saved local data. ${error.message}`;
    }
  }
  market = prepareMarketDataFromStatic(tickers);
}

function prepareMarketDataFromApi(payload) {
  const normalized = {};
  Object.entries(payload.tickers).forEach(([ticker, item]) => {
    normalized[ticker] = {
      rows: item.rows || [],
      latestPrice: Number(item.latestPrice) || item.rows?.at(-1)?.adjClose,
      latestTime: item.latestTime || null,
      currency: item.currency || "USD",
    };
  });
  return buildMarket(normalized);
}

function prepareMarketDataFromStatic(tickers) {
  if (!window.MARKET_DATA || !window.MARKET_DATA.tickers) {
    throw new Error("Missing market-data.js. Run scripts/fetch_market_data.py first.");
  }
  const normalized = {};
  tickers.forEach((ticker) => {
    const item = window.MARKET_DATA.tickers[ticker] || [];
    const rows = Array.isArray(item) ? item : item.rows || [];
    normalized[ticker] = {
      rows,
      latestPrice: Array.isArray(item) ? rows.at(-1)?.adjClose : item.latestPrice || rows.at(-1)?.adjClose,
      latestTime: Array.isArray(item) ? null : item.latestTime || null,
      currency: Array.isArray(item) ? "USD" : item.currency || "USD",
    };
  });
  state.dataSource = window.MARKET_DATA.source || "Saved local market-data.js";
  return buildMarket(normalized);
}

function buildMarket(raw) {
  const priceMaps = new Map();
  const latestPrices = new Map();
  const latestTimes = new Map();
  Object.entries(raw).forEach(([ticker, item]) => {
    const rows = item.rows || [];
    priceMaps.set(ticker, new Map(rows.map((row) => [row.date, row.adjClose])));
    latestPrices.set(ticker, item.latestPrice || rows.at(-1)?.adjClose || 0);
    latestTimes.set(ticker, item.latestTime);
  });

  const maps = [...priceMaps.values()].filter((prices) => prices.size > 0);
  if (!maps.length) return emptyMarket();
  const commonDates = maps.reduce((dates, prices) => {
    if (!dates) return new Set(prices.keys());
    return new Set([...dates].filter((date) => prices.has(date)));
  }, null);

  const dates = [...commonDates].sort();
  const returnsByTicker = new Map();
  priceMaps.forEach((prices, ticker) => {
    const returns = [];
    for (let i = 1; i < dates.length; i += 1) {
      returns.push(prices.get(dates[i]) / prices.get(dates[i - 1]) - 1);
    }
    returnsByTicker.set(ticker, returns);
  });

  return {
    dates: dates.slice(1).map((date) => new Date(`${date}T00:00:00`)),
    latestDate: dates[dates.length - 1],
    latestPrices,
    latestTimes,
    returnsByTicker,
  };
}

function emptyMarket() {
  return {
    dates: [],
    latestDate: "",
    latestPrices: new Map(),
    latestTimes: new Map(),
    returnsByTicker: new Map(),
  };
}

function renderHoldings() {
  elements.allocations.innerHTML = "";
  state.holdings.forEach((holding, index) => {
    const asset = getAsset(holding.ticker);
    const row = document.createElement("div");
    row.className = "allocation-row";
    row.innerHTML = `
      <input class="ticker-input" list="tickerList" type="text" value="${holding.ticker}" aria-label="Holding ${index + 1} ticker" />
      <input type="number" min="0" step="0.01" value="${holding.shares}" aria-label="${holding.ticker} shares" />
      <span class="allocation-value" id="weight-${index}">-</span>
      <button class="remove-button" type="button" title="Remove holding" aria-label="Remove ${holding.ticker}">×</button>
      <div class="holding-meta">
        <span class="swatch" style="background:${asset.color}"></span>
        ${asset.name || asset.type} · Latest price <strong id="price-${index}">-</strong> · Market value <strong id="value-${index}">-</strong>
      </div>
    `;

    const tickerInput = row.querySelector(".ticker-input");
    const commitTicker = async (event) => {
      const ticker = event.target.value.trim().toUpperCase();
      if (!ticker) return;
      event.target.value = ticker;
      state.holdings[index].ticker = ticker;
      await loadMarketDataForHoldings();
      renderHoldings();
      update();
    };
    tickerInput.addEventListener("change", commitTicker);
    tickerInput.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await commitTicker(event);
      }
    });

    row.querySelector('input[type="number"]').addEventListener("input", (event) => {
      state.holdings[index].shares = Math.max(0, Number(event.target.value) || 0);
      update();
    });

    row.querySelector("button").addEventListener("click", async () => {
      state.holdings.splice(index, 1);
      if (state.holdings.length === 0) state.holdings.push({ ticker: "SPY", shares: 1 });
      await loadMarketDataForHoldings();
      renderHoldings();
      update();
    });

    elements.allocations.appendChild(row);
  });
}

async function addHolding() {
  const used = new Set(state.holdings.map((holding) => holding.ticker));
  const next = ["SPY", "QQQ", "TLT", "GLD", "AAPL", "MSFT"].find((ticker) => !used.has(ticker)) || "SPY";
  state.holdings.push({ ticker: next, shares: 1 });
  await loadMarketDataForHoldings();
  renderHoldings();
  update();
}

async function resetHoldings() {
  await applyPreset(state.preset);
}

async function applyPreset(preset) {
  if (preset === "individual") {
    state.brokerValue = 0;
    state.holdings = [
      { ticker: "NVDA", shares: 34.54 },
      { ticker: "TSLA", shares: 13.56 },
      { ticker: "VOO", shares: 13.72 },
      { ticker: "SCHD", shares: 103 },
      { ticker: "SGOV", shares: 12.43 },
      { ticker: "QQQM", shares: 4.95 },
      { ticker: "VXUS", shares: 52.09 },
      { ticker: "BND", shares: 9.63 },
      { ticker: "META", shares: 0.322 },
      { ticker: "BABA", shares: 19 },
      { ticker: "SMH", shares: 6.77 },
      { ticker: "CIBR", shares: 9.74 },
      { ticker: "BOTZ", shares: 16.07 },
      { ticker: "VOT", shares: 2.12 },
      { ticker: "ASML", shares: 1.51 },
      { ticker: "SPHR", shares: 10.31 },
      { ticker: "ANET", shares: 3.21 },
      { ticker: "GOOGL", shares: 19.36 },
      { ticker: "AGQ", shares: 3.03 },
      { ticker: "SLV", shares: 23 },
      { ticker: "SIL", shares: 8.76 },
      { ticker: "GLD", shares: 5.56 },
      { ticker: "SPCX", shares: 33.23 },
    ];
  } else {
    state.brokerValue = 0;
    state.holdings = [
      { ticker: "SPY", shares: 10 },
      { ticker: "QQQ", shares: 4 },
      { ticker: "BND", shares: 20 },
      { ticker: "GLD", shares: 3 },
      { ticker: "NVDA", shares: 2 },
    ];
  }
  elements.brokerValue.value = state.brokerValue || "";
  await loadMarketDataForHoldings();
  renderHoldings();
  update();
}

function update() {
  if (market.dates.length < 2) {
    elements.dataSource.textContent = "Not enough market data for the selected holdings.";
    return;
  }
  const portfolio = getPortfolio();
  const startIndex = Math.max(0, market.dates.length - Math.min(state.lookback, market.dates.length));
  const dates = market.dates.slice(startIndex);
  const portfolioReturns = buildPortfolioReturns(portfolio.assets, portfolio.weights, startIndex);
  const cumulative = buildCumulative(portfolioReturns);
  const drawdowns = buildDrawdowns(cumulative);
  const metrics = calculateMetrics(portfolioReturns, drawdowns);
  const riskContributions = calculateRiskContributions(portfolio.assets, portfolio.weights, startIndex);
  const scenarios = analyzeRebalanceScenarios(portfolio, startIndex);

  updateHoldingLabels(portfolio);
  updateMetrics(metrics);
  updateRecommendations(portfolio, metrics, startIndex, riskContributions);
  updateRebalanceLab(scenarios);
  updateStressTests(portfolio);
  updateCorrelation(portfolio.assets, startIndex);
  drawLineChart(document.getElementById("performanceChart"), cumulative, { color: "#137c78", fill: true, percentAxis: false });
  drawLineChart(document.getElementById("drawdownChart"), drawdowns, { color: "#b42318", fill: true, percentAxis: true });
  drawHistogram(document.getElementById("histogramChart"), portfolioReturns, metrics.varDaily);

  const firstDate = dates[0].toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const lastDate = dates[dates.length - 1].toLocaleDateString("en-US", { month: "short", year: "numeric" });
  elements.sampleRange.textContent = `${firstDate} - ${lastDate} | adjusted closes`;
  elements.dataSource.textContent = `${state.liveMode ? "Live local server mode" : "Static file mode"} · tickers from ${state.symbolsSource} · prices from ${state.dataSource} · latest ${formatDate(market.latestDate)}. Free data may be delayed and is for prototype use.`;
  latestAnalysis = { portfolio, metrics, riskContributions, scenarios, startIndex, firstDate, lastDate };
}

function getPortfolio() {
  const active = state.holdings
    .filter((holding) => holding.shares > 0)
    .map((holding) => {
      const ticker = holding.ticker.toUpperCase();
      const price = market.latestPrices.get(ticker) || 0;
      return { ...holding, ticker, asset: getAsset(ticker), price, value: holding.shares * price };
    })
    .filter((holding) => holding.value > 0 && market.returnsByTicker.has(holding.ticker));
  const holdingsValue = active.reduce((sum, holding) => sum + holding.value, 0);
  const brokerValue = state.brokerValue > 0 ? state.brokerValue : 0;
  const reconciliationValue = brokerValue > 0 ? brokerValue - holdingsValue : 0;
  const totalValue = holdingsValue || 1;
  return {
    holdings: active,
    assets: active.map((holding) => holding.asset),
    weights: active.map((holding) => holding.value / totalValue),
    holdingsValue,
    brokerValue,
    reconciliationValue,
    totalValue,
  };
}

function buildPortfolioReturns(assets, weights, startIndex) {
  const series = assets.map((asset) => market.returnsByTicker.get(asset.ticker).slice(startIndex));
  return series[0].map((_, rowIndex) => dot(series.map((assetReturns) => assetReturns[rowIndex]), weights));
}

function updateHoldingLabels(portfolio) {
  elements.portfolioValue.textContent = formatCurrency(portfolio.totalValue);
  updateBrokerSync(portfolio);
  state.holdings.forEach((holding, index) => {
    const ticker = holding.ticker.toUpperCase();
    const price = market.latestPrices.get(ticker) || 0;
    const value = holding.shares * price;
    const weight = portfolio.totalValue > 0 ? value / portfolio.totalValue : 0;
    setText(`weight-${index}`, formatPercent(weight, 1));
    setText(`price-${index}`, price ? formatCurrency(price) : "unavailable");
    setText(`value-${index}`, formatCurrency(value));
  });
}

function updateBrokerSync(portfolio) {
  if (!state.brokerValue) {
    elements.brokerSync.textContent = `Selected holdings: ${formatCurrency(portfolio.holdingsValue)}. Optional: enter the broker's stock subtotal, not the full account value, to reconcile this stock-only view.`;
    return;
  }
  const gap = portfolio.reconciliationValue;
  const gapLabel = gap >= 0 ? "above" : "below";
  elements.brokerSync.textContent = `Broker subtotal entered: ${formatCurrency(portfolio.brokerValue)} · Selected holdings: ${formatCurrency(portfolio.holdingsValue)} · ${formatCurrency(Math.abs(gap))} ${gapLabel} selected live marks.`;
}

function calculateMetrics(returns, drawdowns) {
  const meanDaily = mean(returns);
  const volDaily = standardDeviation(returns);
  const annualReturn = Math.pow(1 + meanDaily, tradingDays) - 1;
  const annualVol = volDaily * Math.sqrt(tradingDays);
  const sharpe = annualVol === 0 ? 0 : (annualReturn - riskFreeRate) / annualVol;
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.max(0, Math.floor((1 - state.confidence) * sorted.length));
  const varDaily = sorted[index];
  const cvarDaily = mean(sorted.slice(0, index + 1));
  return { annualReturn, annualVol, sharpe, maxDrawdown: Math.min(...drawdowns), varDaily, cvarDaily };
}

function updateMetrics(metrics) {
  elements.annualReturn.textContent = formatPercent(metrics.annualReturn, 1);
  elements.annualVol.textContent = formatPercent(metrics.annualVol, 1);
  elements.sharpe.textContent = metrics.sharpe.toFixed(2);
  elements.maxDrawdown.textContent = formatPercent(metrics.maxDrawdown, 1);
  elements.varMetric.textContent = formatPercent(metrics.varDaily, 2);
  elements.cvarMetric.textContent = formatPercent(metrics.cvarDaily, 2);
}

function updateRecommendations(portfolio, metrics, startIndex, riskContributions = calculateRiskContributions(portfolio.assets, portfolio.weights, startIndex)) {
  const largestHolding = portfolio.holdings.reduce((max, holding, index) => {
    const weight = portfolio.weights[index] || 0;
    return weight > max.weight ? { holding, weight } : max;
  }, { holding: null, weight: 0 });
  const topRisk = riskContributions[0];
  const secondRisk = riskContributions[1];
  const growthWeight = portfolio.holdings.reduce((sum, holding, index) => sum + (isGrowthTicker(holding.ticker) ? portfolio.weights[index] : 0), 0);
  const semisWeight = portfolio.holdings.reduce((sum, holding, index) => sum + (isSemiconductorTicker(holding.ticker) ? portfolio.weights[index] : 0), 0);
  const speculativeWeight = portfolio.holdings.reduce((sum, holding, index) => sum + (isSpeculativeTicker(holding.ticker) ? portfolio.weights[index] : 0), 0);
  const messages = [];

  messages.push({
    label: riskLabel(metrics),
    title: "Portfolio posture",
    body: `This is an aggressive growth portfolio: ${formatPercent(metrics.annualVol, 1)} volatility, ${formatPercent(metrics.maxDrawdown, 1)} max drawdown, and ${formatPercent(growthWeight, 0)} in growth/tech-style exposure.`,
  });

  if (largestHolding.holding && largestHolding.weight > 0.2) {
    const targetWeight = 0.2;
    const trimAmount = Math.max(0, largestHolding.holding.value - portfolio.totalValue * targetWeight);
    messages.push({
      label: "Trim",
      title: `Cap ${largestHolding.holding.ticker} near 20%`,
      body: `${largestHolding.holding.ticker} is ${formatPercent(largestHolding.weight, 1)} of the portfolio. Trimming about ${formatCurrency(trimAmount)} would bring it closer to a 20% position and reduce single-name risk.`,
    });
  }

  if (topRisk && topRisk.riskShare > 0.25) {
    const riskNames = secondRisk ? `${topRisk.ticker} and ${secondRisk.ticker}` : topRisk.ticker;
    messages.push({
      label: "Risk",
      title: "Reduce volatility contribution",
      body: `${riskNames} are the largest volatility contributors. If you want a smoother portfolio, trim the highest-risk contributor before trimming tiny positions like PLTR or RIVN.`,
    });
  }

  if (semisWeight > 0.35) {
    messages.push({
      label: "Diversify",
      title: "Avoid one big semiconductor bet",
      body: `${formatPercent(semisWeight, 0)} is tied to semiconductor/AI infrastructure names. Consider redirecting new money into non-tech sectors or broad market exposure instead of adding more semis.`,
    });
  }

  if (metrics.annualVol > 0.25 || metrics.maxDrawdown < -0.25) {
    const stabilizerAmount = portfolio.totalValue * 0.15;
    messages.push({
      label: "Add",
      title: "Add 10%-20% stabilizer exposure",
      body: `A ${formatCurrency(stabilizerAmount)} stabilizer sleeve could go into TLT/IEF for duration exposure, SGOV/BIL for cash-like ballast, or SPY for broader diversification.`,
    });
  }

  if (speculativeWeight > 0.05) {
    messages.push({
      label: "Size",
      title: "Keep speculative names intentionally small",
      body: `${formatPercent(speculativeWeight, 1)} is in smaller/speculative positions. That sizing is reasonable; avoid increasing them unless you have a clear thesis and risk limit.`,
    });
  }

  messages.push({
    label: "Target",
    title: "Simple target mix",
    body: "For a cleaner growth portfolio: 60%-70% core growth/equity, 15%-25% diversifiers, 10%-15% high-conviction satellites, and 5%-10% cash or short-term Treasury exposure.",
  });

  elements.recommendations.innerHTML = messages
    .slice(0, 6)
    .map((message) => `<div class="recommendation"><div class="recommendation-label">${message.label}</div><strong>${message.title}</strong><span>${message.body}</span></div>`)
    .join("");
}

function analyzeRebalanceScenarios(portfolio, startIndex) {
  const scenarios = buildRebalanceScenarios(portfolio);
  return scenarios.map((scenario) => {
    const assets = scenario.allocations.map((allocation) => getAsset(allocation.ticker));
    const weights = scenario.allocations.map((allocation) => allocation.weight);
    const returns = buildPortfolioReturns(assets, weights, startIndex);
    const cumulative = buildCumulative(returns);
    const metrics = calculateMetrics(returns, buildDrawdowns(cumulative));
    const biggestRisk = calculateRiskContributions(assets, weights, startIndex)[0];
    return { ...scenario, metrics, biggestRisk };
  });
}

function updateRebalanceLab(scenarioRows) {
  const current = scenarioRows[0];
  elements.rebalanceLab.innerHTML = `
    <div class="scenario-summary">
      ${scenarioRows
        .map((scenario) => {
          const deltaVol = scenario.metrics.annualVol - current.metrics.annualVol;
          const deltaDrawdown = scenario.metrics.maxDrawdown - current.metrics.maxDrawdown;
          return `
            <article class="scenario-card">
              <div class="scenario-card-header">
                <span>${scenario.badge}</span>
                <strong>${scenario.name}</strong>
              </div>
              <p>${scenario.description}</p>
              <div class="scenario-metrics">
                <span>Return <strong>${formatPercent(scenario.metrics.annualReturn, 1)}</strong></span>
                <span>Vol <strong>${formatPercent(scenario.metrics.annualVol, 1)}</strong></span>
                <span>Sharpe <strong>${scenario.metrics.sharpe.toFixed(2)}</strong></span>
                <span>Drawdown <strong>${formatPercent(scenario.metrics.maxDrawdown, 1)}</strong></span>
                <span>VaR <strong>${formatPercent(scenario.metrics.varDaily, 2)}</strong></span>
                <span>CVaR <strong>${formatPercent(scenario.metrics.cvarDaily, 2)}</strong></span>
              </div>
              <div class="scenario-note">
                ${scenario.name === "Current" ? "Baseline portfolio." : `${formatSignedPercent(deltaVol, 1)} volatility and ${formatSignedPercent(deltaDrawdown, 1)} drawdown versus current.`}
                Biggest risk: ${scenario.biggestRisk?.ticker || "-"}.
              </div>
              <div class="allocation-chips">
                ${scenario.allocations
                  .slice(0, 7)
                  .map((allocation) => `<span>${allocation.ticker} ${formatPercent(allocation.weight, 0)}</span>`)
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
    <div class="scenario-table-wrap">
      <table class="scenario-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Objective</th>
            <th>Return</th>
            <th>Vol</th>
            <th>Sharpe</th>
            <th>Max DD</th>
            <th>CVaR</th>
            <th>Risk Driver</th>
          </tr>
        </thead>
        <tbody>
          ${scenarioRows
            .map(
              (scenario) => `
                <tr>
                  <td>${scenario.name}</td>
                  <td>${scenario.objective}</td>
                  <td>${formatPercent(scenario.metrics.annualReturn, 1)}</td>
                  <td>${formatPercent(scenario.metrics.annualVol, 1)}</td>
                  <td>${scenario.metrics.sharpe.toFixed(2)}</td>
                  <td>${formatPercent(scenario.metrics.maxDrawdown, 1)}</td>
                  <td>${formatPercent(scenario.metrics.cvarDaily, 2)}</td>
                  <td>${scenario.biggestRisk?.ticker || "-"}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function exportMemo() {
  if (!latestAnalysis) return;
  elements.memoContent.innerHTML = buildMemoContent(latestAnalysis);
  elements.memoPanel.classList.remove("hidden");
  elements.memoPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildMemoContent(analysis) {
  const { portfolio, metrics, riskContributions, scenarios, firstDate, lastDate } = analysis;
  const balanced = scenarios.find((scenario) => scenario.name === "Balanced Growth") || scenarios[1];
  const defensive = scenarios.find((scenario) => scenario.name === "Defensive") || scenarios[1];
  const topHoldings = portfolio.holdings
    .map((holding, index) => ({ ...holding, weight: portfolio.weights[index] }))
    .sort((a, b) => b.weight - a.weight);
  const stress = getStressTests(portfolio);
  const conclusion = buildMemoConclusion(metrics, balanced, defensive, riskContributions);

  return `
          <header class="memo-header">
            <div>
              <p class="eyebrow">Investment Risk Memo</p>
              <h1>Portfolio Risk Review</h1>
            </div>
            <div class="meta">
              Selected holdings: ${formatCurrency(portfolio.holdingsValue)}<br />
              Broker stock subtotal: ${portfolio.brokerValue ? formatCurrency(portfolio.brokerValue) : "Not entered"}<br />
              Reconciliation: ${formatCurrency(portfolio.reconciliationValue)}<br />
              Lookback: ${firstDate} - ${lastDate}<br />
              Data: ${formatDate(market.latestDate)} adjusted closes
            </div>
          </header>

          <section>
            <h2>Executive Summary</h2>
            <div class="callout">
              <p>${conclusion}</p>
            </div>
            <div class="memo-metric-grid">
              ${memoMetric("Annual Return", formatPercent(metrics.annualReturn, 1))}
              ${memoMetric("Volatility", formatPercent(metrics.annualVol, 1))}
              ${memoMetric("Sharpe", metrics.sharpe.toFixed(2))}
              ${memoMetric("Max Drawdown", formatPercent(metrics.maxDrawdown, 1))}
              ${memoMetric("VaR", formatPercent(metrics.varDaily, 2))}
              ${memoMetric("CVaR", formatPercent(metrics.cvarDaily, 2))}
            </div>
          </section>

          <section class="two-col">
            <div>
              <h2>Top Holdings</h2>
              <table>
                <thead><tr><th>Ticker</th><th>Shares</th><th>Value</th><th>Weight</th></tr></thead>
                <tbody>
                  ${topHoldings.slice(0, 10).map((holding) => `<tr><td>${holding.ticker}</td><td>${holding.shares}</td><td>${formatCurrency(holding.value)}</td><td>${formatPercent(holding.weight, 1)}</td></tr>`).join("")}
                </tbody>
              </table>
            </div>
            <div>
              <h2>Risk Drivers</h2>
              <table>
                <thead><tr><th>Ticker</th><th>Risk Share</th></tr></thead>
                <tbody>
                  ${riskContributions.slice(0, 7).map((item) => `<tr><td>${item.ticker}</td><td>${formatPercent(item.riskShare, 1)}</td></tr>`).join("")}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>Rebalance Alternatives</h2>
            <table>
              <thead><tr><th>Scenario</th><th>Objective</th><th>Return</th><th>Vol</th><th>Sharpe</th><th>Max DD</th><th>CVaR</th><th>Risk Driver</th></tr></thead>
              <tbody>
                ${scenarios.map((scenario) => `<tr><td>${scenario.name}</td><td>${scenario.objective}</td><td>${formatPercent(scenario.metrics.annualReturn, 1)}</td><td>${formatPercent(scenario.metrics.annualVol, 1)}</td><td>${scenario.metrics.sharpe.toFixed(2)}</td><td>${formatPercent(scenario.metrics.maxDrawdown, 1)}</td><td>${formatPercent(scenario.metrics.cvarDaily, 2)}</td><td>${scenario.biggestRisk?.ticker || "-"}</td></tr>`).join("")}
              </tbody>
            </table>
          </section>

          <section class="two-col">
            <div>
              <h2>Stress Tests</h2>
              <table>
                <thead><tr><th>Scenario</th><th>Estimated Impact</th></tr></thead>
                <tbody>
                  ${stress.map((item) => `<tr><td>${item.label}</td><td class="${item.impact < 0 ? "risk" : ""}">${formatPercent(item.impact, 1)}</td></tr>`).join("")}
                </tbody>
              </table>
            </div>
            <div>
              <h2>Recommendation</h2>
              <p><strong>Preferred scenario:</strong> ${balanced?.name || "Balanced Growth"}</p>
              <p>The balanced scenario reduces concentration and improves portfolio durability while preserving growth exposure. The defensive scenario is more appropriate if the objective is capital preservation or lower drawdown tolerance.</p>
              <p><strong>Next action:</strong> cap the largest single-name position, redirect new capital toward diversifiers, and set explicit risk limits for speculative holdings.</p>
            </div>
          </section>
        `;
}

function memoMetric(label, value) {
  return `<div class="memo-metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function buildMemoConclusion(metrics, balanced, defensive, riskContributions) {
  const biggestRisk = riskContributions[0]?.ticker || "the largest growth holding";
  const volReduction = balanced ? metrics.annualVol - balanced.metrics.annualVol : 0;
  const ddImprovement = balanced ? balanced.metrics.maxDrawdown - metrics.maxDrawdown : 0;
  return `The current portfolio has delivered strong historical performance, but it is an aggressive growth portfolio with elevated volatility and meaningful drawdown risk. The largest risk driver is ${biggestRisk}. The Balanced Growth scenario reduces annualized volatility by ${formatPercent(volReduction, 1)} and improves max drawdown by ${formatPercent(ddImprovement, 1)} versus the current portfolio, while keeping the core growth thesis intact.`;
}

function getStressTests(portfolio) {
  const shocks = [
    { label: "Equity selloff", equity: -0.08, growth: -0.12, bond: 0.025, gold: 0.02, financials: -0.09 },
    { label: "Rates +100 bps", equity: -0.025, growth: -0.04, bond: -0.12, gold: -0.02, financials: -0.015 },
    { label: "Risk-on rally", equity: 0.055, growth: 0.08, bond: -0.025, gold: -0.01, financials: 0.06 },
    { label: "Inflation shock", equity: -0.04, growth: -0.06, bond: -0.075, gold: 0.05, financials: -0.03 },
  ];
  return shocks.map((shock) => ({
    label: shock.label,
    impact: portfolio.assets.reduce((sum, asset, index) => sum + stressMove(asset.ticker, shock) * portfolio.weights[index], 0),
  }));
}

function buildRebalanceScenarios(portfolio) {
  const currentAllocations = portfolio.holdings.map((holding, index) => ({
    ticker: holding.ticker,
    weight: portfolio.weights[index],
  }));

  return [
    {
      name: "Current",
      badge: "Base",
      objective: "What you hold now",
      description: "The selected holdings converted from shares into dollar weights.",
      allocations: normalizeAllocations(currentAllocations),
    },
    {
      name: "Defensive",
      badge: "Lower risk",
      objective: "Reduce drawdowns",
      description: "Keeps 65% of the current portfolio, then adds bonds, cash-like exposure, and gold.",
      allocations: normalizeAllocations([...scaleAllocations(currentAllocations, 0.65), { ticker: "TLT", weight: 0.15 }, { ticker: "BIL", weight: 0.12 }, { ticker: "GLD", weight: 0.08 }]),
    },
    {
      name: "Balanced Growth",
      badge: "Best fit",
      objective: "Keep upside, reduce concentration",
      description: "Caps single names near 18%, keeps growth exposure, and adds broad-market plus bond ballast.",
      allocations: normalizeAllocations([...capAllocations(currentAllocations, 0.18, 0.72), { ticker: "SPY", weight: 0.16 }, { ticker: "IEF", weight: 0.08 }, { ticker: "XLV", weight: 0.04 }]),
    },
    {
      name: "High Conviction",
      badge: "Aggressive",
      objective: "Preserve high-upside thesis",
      description: "Keeps the top conviction names dominant while limiting the smallest speculative tail.",
      allocations: normalizeAllocations([...topHeavyAllocations(currentAllocations, 0.88), { ticker: "SPY", weight: 0.07 }, { ticker: "BIL", weight: 0.05 }]),
    },
  ];
}

function scaleAllocations(allocations, scale) {
  return allocations.map((allocation) => ({ ...allocation, weight: allocation.weight * scale }));
}

function capAllocations(allocations, cap, totalTarget) {
  const capped = allocations.map((allocation) => ({ ...allocation, weight: Math.min(allocation.weight, cap) }));
  return scaleAllocations(normalizeAllocations(capped), totalTarget);
}

function topHeavyAllocations(allocations, totalTarget) {
  const sorted = [...allocations].sort((a, b) => b.weight - a.weight);
  const top = sorted.slice(0, 6).map((allocation) => ({ ...allocation, weight: allocation.weight }));
  const tail = sorted.slice(6).map((allocation) => ({ ...allocation, weight: Math.min(allocation.weight, 0.015) }));
  return scaleAllocations(normalizeAllocations([...top, ...tail]), totalTarget);
}

function normalizeAllocations(allocations) {
  const combined = new Map();
  allocations.forEach((allocation) => {
    if (!market.returnsByTicker.has(allocation.ticker)) return;
    combined.set(allocation.ticker, (combined.get(allocation.ticker) || 0) + allocation.weight);
  });
  const total = [...combined.values()].reduce((sum, weight) => sum + weight, 0) || 1;
  return [...combined.entries()]
    .map(([ticker, weight]) => ({ ticker, weight: weight / total }))
    .sort((a, b) => b.weight - a.weight);
}

function riskLabel(metrics) {
  if (metrics.annualVol > 0.3 || metrics.maxDrawdown < -0.3) return "High risk";
  if (metrics.annualVol > 0.18 || metrics.maxDrawdown < -0.18) return "Moderate risk";
  return "Lower risk";
}

function isGrowthTicker(ticker) {
  return ["ANET", "SPHR", "ASML", "NVDA", "QQQ", "LAES", "MU", "OKLO", "AMD", "PLTR", "RIVN"].includes(ticker);
}

function isSemiconductorTicker(ticker) {
  return ["ANET", "ASML", "NVDA", "QQQ", "LAES", "MU", "AMD"].includes(ticker);
}

function isSpeculativeTicker(ticker) {
  return ["LAES", "OKLO", "PLTR", "RIVN"].includes(ticker);
}

function calculateRiskContributions(assets, weights, startIndex) {
  const series = assets.map((asset) => market.returnsByTicker.get(asset.ticker).slice(startIndex));
  const cov = series.map((a) => series.map((b) => covariance(a, b)));
  const marginal = cov.map((row) => dot(row, weights));
  const variance = dot(weights, marginal) || 1;
  return assets.map((asset, index) => ({ ticker: asset.ticker, riskShare: Math.max(0, (weights[index] * marginal[index]) / variance) })).sort((a, b) => b.riskShare - a.riskShare);
}

function findDiversifier(assets, startIndex) {
  const held = new Set(assets.map((asset) => asset.ticker));
  const candidates = [...market.returnsByTicker.keys()].filter((ticker) => !held.has(ticker)).map(getAsset);
  if (!candidates.length) return getAsset("TLT");
  const portfolioProxy = assets.map((asset) => market.returnsByTicker.get(asset.ticker).slice(startIndex));
  const equalWeights = assets.map(() => 1 / assets.length);
  const portfolioSeries = portfolioProxy[0].map((_, rowIndex) => dot(portfolioProxy.map((series) => series[rowIndex]), equalWeights));
  return candidates
    .map((asset) => ({ asset, score: correlation(portfolioSeries, market.returnsByTicker.get(asset.ticker).slice(startIndex)) + standardDeviation(market.returnsByTicker.get(asset.ticker).slice(startIndex)) * 8 }))
    .sort((a, b) => a.score - b.score)[0].asset;
}

function rankStandaloneSharpe(startIndex) {
  return [...market.returnsByTicker.keys()]
    .map((ticker) => {
      const returns = market.returnsByTicker.get(ticker).slice(startIndex);
      const annualReturn = Math.pow(1 + mean(returns), tradingDays) - 1;
      const annualVol = standardDeviation(returns) * Math.sqrt(tradingDays);
      return { ticker, sharpe: annualVol ? (annualReturn - riskFreeRate) / annualVol : 0 };
    })
    .sort((a, b) => b.sharpe - a.sharpe);
}

function updateStressTests(portfolio) {
  const shocks = [
    { label: "Equity selloff", equity: -0.08, growth: -0.12, bond: 0.025, gold: 0.02, financials: -0.09 },
    { label: "Rates +100 bps", equity: -0.025, growth: -0.04, bond: -0.12, gold: -0.02, financials: -0.015 },
    { label: "Risk-on rally", equity: 0.055, growth: 0.08, bond: -0.025, gold: -0.01, financials: 0.06 },
    { label: "Inflation shock", equity: -0.04, growth: -0.06, bond: -0.075, gold: 0.05, financials: -0.03 },
  ];

  elements.stressTests.innerHTML = shocks.map((shock) => {
    const impact = portfolio.assets.reduce((sum, asset, index) => sum + stressMove(asset.ticker, shock) * portfolio.weights[index], 0);
    return `<div class="stress-row"><span>${shock.label}</span><strong>${formatPercent(impact, 1)}</strong></div>`;
  }).join("");
}

function stressMove(ticker, shock) {
  if (ticker === "TLT" || ticker.includes("BOND") || ticker.includes("TREAS")) return shock.bond;
  if (ticker === "GLD" || ticker.includes("GOLD")) return shock.gold;
  if (["JPM", "GS", "BLK", "BRK-B"].includes(ticker)) return shock.financials;
  if (["QQQ", "NVDA", "AAPL", "MSFT", "AMZN", "META", "GOOGL"].includes(ticker)) return shock.growth;
  return shock.equity;
}

function updateCorrelation(assets, startIndex) {
  const series = assets.map((asset) => market.returnsByTicker.get(asset.ticker).slice(startIndex));
  let html = `<div class="corr-grid" style="grid-template-columns:72px repeat(${assets.length}, 48px)"><span></span>${assets.map((asset) => `<span class="corr-label">${asset.ticker}</span>`).join("")}`;
  assets.forEach((rowAsset, rowIndex) => {
    html += `<span class="corr-label">${rowAsset.ticker}</span>`;
    assets.forEach((_, colIndex) => {
      const corr = correlation(series[rowIndex], series[colIndex]);
      html += `<span class="corr-cell" style="background:${corrColor(corr)}">${corr.toFixed(2)}</span>`;
    });
  });
  elements.correlationMatrix.innerHTML = `${html}</div>`;
}

function buildCumulative(returns) {
  const values = [1];
  returns.forEach((value) => values.push(values[values.length - 1] * (1 + value)));
  return values.slice(1);
}

function buildDrawdowns(cumulative) {
  let peak = cumulative[0];
  return cumulative.map((value) => {
    peak = Math.max(peak, value);
    return value / peak - 1;
  });
}

function drawLineChart(canvas, values, options) {
  const ctx = canvas.getContext("2d");
  const cssHeight = Number(canvas.dataset.baseHeight || canvas.getAttribute("height") || 250);
  canvas.dataset.baseHeight = String(cssHeight);
  canvas.style.height = `${cssHeight}px`;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio;
  canvas.height = cssHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = rect.width;
  const height = cssHeight;
  const padding = { top: 14, right: 12, bottom: 26, left: 42 };
  const min = Math.min(...values, options.percentAxis ? 0 : Math.min(...values));
  const max = Math.max(...values, options.percentAxis ? 0 : Math.max(...values));
  const range = max - min || 1;

  ctx.clearRect(0, 0, width, height);
  drawAxes(ctx, width, height, padding, min, max, options.percentAxis);
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = padding.left + (index / (values.length - 1)) * (width - padding.left - padding.right);
    const y = padding.top + ((max - value) / range) * (height - padding.top - padding.bottom);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = options.color;
  ctx.stroke();

  if (options.fill) {
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, `${options.color}33`);
    gradient.addColorStop(1, `${options.color}05`);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

function drawHistogram(canvas, returns, varDaily) {
  const ctx = canvas.getContext("2d");
  const cssHeight = Number(canvas.dataset.baseHeight || canvas.getAttribute("height") || 230);
  canvas.dataset.baseHeight = String(cssHeight);
  canvas.style.height = `${cssHeight}px`;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio;
  canvas.height = cssHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = rect.width;
  const height = cssHeight;
  const padding = { top: 14, right: 12, bottom: 26, left: 42 };
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const bins = 28;
  const counts = Array.from({ length: bins }, () => 0);
  returns.forEach((value) => {
    const index = Math.min(bins - 1, Math.max(0, Math.floor(((value - min) / (max - min || 1)) * bins)));
    counts[index] += 1;
  });

  ctx.clearRect(0, 0, width, height);
  drawAxes(ctx, width, height, padding, 0, Math.max(...counts), false, true);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barWidth = plotWidth / bins;
  counts.forEach((count, index) => {
    const x = padding.left + index * barWidth + 1;
    const h = (count / Math.max(...counts)) * plotHeight;
    const binMid = min + ((index + 0.5) / bins) * (max - min);
    ctx.fillStyle = binMid <= varDaily ? "#b42318" : "#137c78";
    ctx.fillRect(x, height - padding.bottom - h, Math.max(1, barWidth - 2), h);
  });
}

function drawAxes(ctx, width, height, padding, min, max, percentAxis, hideYLabels = false) {
  ctx.strokeStyle = "#d7dee8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  ctx.fillStyle = "#667085";
  ctx.font = "11px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  if (!hideYLabels) {
    [0, 0.5, 1].forEach((tick) => {
      const value = min + tick * (max - min);
      const y = padding.top + (1 - tick) * (height - padding.top - padding.bottom);
      ctx.fillText(percentAxis ? formatPercent(value, 0) : value.toFixed(2), padding.left - 8, y);
      ctx.strokeStyle = "#eef2f6";
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    });
  }
}

function getAsset(ticker) {
  const found = universe.find((asset) => asset.ticker === ticker);
  if (found) return found;
  return { ticker, name: "Custom ticker", type: "Stock", color: colorForTicker(ticker) };
}

function colorForIndex(index) {
  const palette = ["#17365d", "#137c78", "#6b5ca5", "#b7791f", "#9b3d3d", "#3c6e71", "#2563eb", "#16a34a", "#ea580c", "#7c3aed"];
  return palette[index % palette.length];
}

function colorForTicker(ticker) {
  return colorForIndex([...ticker].reduce((sum, char) => sum + char.charCodeAt(0), 0));
}

function corrColor(value) {
  const red = Math.round(180 * Math.max(0, value));
  const blue = Math.round(125 * Math.max(0, -value));
  const green = Math.round(90 + 80 * (1 - Math.abs(value)));
  return `rgb(${red}, ${green}, ${blue})`;
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => Math.pow(value - avg, 2))));
}

function covariance(a, b) {
  const meanA = mean(a);
  const meanB = mean(b);
  return mean(a.map((value, index) => (value - meanA) * (b[index] - meanB)));
}

function correlation(a, b) {
  const denom = standardDeviation(a) * standardDeviation(b);
  return denom ? covariance(a, b) / denom : 0;
}

function formatPercent(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatSignedPercent(value, decimals = 1) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value, decimals)}`;
}

function formatCurrency(value) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 100 ? 2 : 0 });
}

function formatDate(dateString) {
  if (!dateString) return "unknown";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

window.addEventListener("resize", update);
init();
