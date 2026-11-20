const STARTING_CASH = 10000;
const STORAGE_KEY = "market-lab-save-v1";

const STOCKS = [
  { symbol: "NVDA", name: "Nova Dynamics", initialPrice: 128.40, volatility: 0.035 },
  { symbol: "GRN", name: "Greenline Energy", initialPrice: 72.15, volatility: 0.022 },
  { symbol: "ORB", name: "Orbit Systems", initialPrice: 214.80, volatility: 0.029 },
  { symbol: "MPL", name: "Maple Foods", initialPrice: 46.75, volatility: 0.016 }
];

const HEADLINES = [
  "Investors weigh a strong quarter against broader market uncertainty.",
  "A burst of trading activity sends the market into a lively session.",
  "Analysts debate whether recent gains can keep going.",
  "A quiet news day leaves prices to follow their own momentum.",
  "Fresh enthusiasm spreads through several corners of the market.",
  "A cautious mood settles in as traders lock in some gains.",
  "Company updates put individual stocks in the spotlight today.",
  "Market watchers look for clues in the next round of results."
];

const $ = (id) => document.getElementById(id);

function createNewGame() {
  return {
    cash: STARTING_CASH,
    day: 1,
    stocks: Object.fromEntries(
      STOCKS.map((stock) => [
        stock.symbol,
        {
          price: stock.initialPrice,
          previousPrice: stock.initialPrice,
          shares: 0,
          history: [stock.initialPrice]
        }
      ])
    ),
    portfolioHistory: [STARTING_CASH],
    message: "Choose a stock to place your first trade.",
    headline: "A fresh session begins. What will you invest in?"
  };
}

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createNewGame();

    const parsed = JSON.parse(saved);

    const valid =
      Number.isFinite(parsed.cash) &&
      Number.isInteger(parsed.day) &&
      parsed.stocks &&
      parsed.portfolioHistory;

    if (!valid) return createNewGame();

    for (const stock of STOCKS) {
      const savedStock = parsed.stocks[stock.symbol];
      if (
        !savedStock ||
        !Number.isFinite(savedStock.price) ||
        !Number.isFinite(savedStock.shares)
      ) {
        return createNewGame();
      }
    }

    return parsed;
  } catch {
    return createNewGame();
  }
}

let game = loadGame();

function saveGame() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {
    // The game remains playable if browser storage is unavailable.
  }
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function signedMoney(value) {
  return `${value >= 0 ? "+" : "−"}${money(Math.abs(value))}`;
}

function percent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getStockDefinition(symbol) {
  return STOCKS.find((stock) => stock.symbol === symbol);
}

function getSelectedSymbol() {
  return $("stockSelect").value || STOCKS[0].symbol;
}

function getInvestedValue() {
  return STOCKS.reduce((total, stock) => {
    const position = game.stocks[stock.symbol];
    return total + position.shares * position.price;
  }, 0);
}

function getPortfolioValue() {
  return game.cash + getInvestedValue();
}

function setMessage(text, kind = "") {
  const message = $("gameMessage");
  message.textContent = text;
  message.className = `message ${kind}`.trim();
}

function renderStockOptions() {
  const select = $("stockSelect");
  const currentSelection = select.value;

  select.innerHTML = STOCKS.map(
    (stock) =>
      `<option value="${stock.symbol}">${stock.name} (${stock.symbol})</option>`
  ).join("");

  if (STOCKS.some((stock) => stock.symbol === currentSelection)) {
    select.value = currentSelection;
  }
}

function renderMarket() {
  const rows = STOCKS.map((stock) => {
    const position = game.stocks[stock.symbol];
    const change = position.price - position.previousPrice;
    const changePercent = position.previousPrice
      ? (change / position.previousPrice) * 100
      : 0;
    const changeClass = change >= 0 ? "positive" : "negative";

    return `
      <tr>
        <td>
          <div class="company-cell">
            <span class="stock-icon">${stock.symbol.slice(0, 2)}</span>
            <span><strong>${stock.name}</strong><small>${stock.symbol}</small></span>
          </div>
        </td>
        <td>${money(position.price)}</td>
        <td class="${changeClass}">${percent(changePercent)}</td>
        <td>${position.shares}</td>
      </tr>
    `;
  }).join("");

  $("marketRows").innerHTML = rows;
}

function renderPortfolio() {
  const positions = STOCKS.filter(
    (stock) => game.stocks[stock.symbol].shares > 0
  );

  if (positions.length === 0) {
    $("portfolioList").innerHTML = `
      <div class="empty-state">
        You don't own any shares yet. Buy a stock to start building your portfolio.
      </div>
    `;
    return;
  }

  $("portfolioList").innerHTML = positions.map((stock) => {
    const position = game.stocks[stock.symbol];
    const value = position.shares * position.price;

    return `
      <div class="position-row">
        <div>
          <strong>${stock.symbol}</strong>
          <small>${position.shares} shares × ${money(position.price)}</small>
        </div>
        <div class="position-value">
          <strong>${money(value)}</strong>
          <small>${stock.name}</small>
        </div>
      </div>
    `;
  }).join("");
}

function renderSelectedStock() {
  const symbol = getSelectedSymbol();
  const definition = getStockDefinition(symbol);
  const position = game.stocks[symbol];

  $("selectedSymbol").textContent = symbol;
  $("selectedName").textContent = definition.name;
  $("selectedPrice").textContent = `${money(position.price)} per share`;

  updateEstimate();
}

function updateEstimate() {
  const symbol = getSelectedSymbol();
  const position = game.stocks[symbol];
  const quantity = Math.max(0, Number($("quantityInput").value) || 0);
  $("orderEstimate").textContent = money(quantity * position.price);
}

function renderSummary() {
  const invested = getInvestedValue();
  const total = game.cash + invested;
  const change = total - STARTING_CASH;
  const changePercent = (change / STARTING_CASH) * 100;

  $("dayLabel").textContent = `Day ${game.day}`;
  $("totalValue").textContent = money(total);
  $("cashValue").textContent = money(game.cash);
  $("investedValue").textContent = money(invested);
  $("returnValue").textContent = signedMoney(change);
  $("returnPercent").textContent = `${percent(changePercent)} overall`;
  $("totalChange").textContent =
    game.day === 1 && change === 0
      ? "Starting balance"
      : `${signedMoney(change)} since starting`;
  $("totalChange").className = `stat-foot ${change >= 0 ? "positive" : "negative"}`;

  $("chartValue").textContent = money(total);
  $("chartCaption").textContent =
    change === 0 ? "Your starting balance" : `${percent(changePercent)} overall`;
  $("chartCaption").className = change >= 0 ? "positive" : "negative";
  $("chartStart").textContent = "Day 1";
  $("chartEnd").textContent = `Day ${game.day}`;
  $("newsText").textContent = game.headline;
}

function drawChart() {
  const canvas = $("portfolioChart");
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * pixelRatio);
  canvas.height = Math.floor(rect.height * pixelRatio);

  const context = canvas.getContext("2d");
  context.scale(pixelRatio, pixelRatio);

  const width = rect.width;
  const height = rect.height;
  const values = game.portfolioHistory.length
    ? game.portfolioHistory
    : [STARTING_CASH];

  const padding = { top: 12, right: 5, bottom: 12, left: 5 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);

  if (maxValue - minValue < 1) {
    minValue -= 100;
    maxValue += 100;
  } else {
    const extra = (maxValue - minValue) * 0.18;
    minValue -= extra;
    maxValue += extra;
  }

  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (index / (values.length - 1)) * plotWidth;
    const y =
      padding.top +
      ((maxValue - value) / (maxValue - minValue)) * plotHeight;
    return { x, y };
  });

  context.clearRect(0, 0, width, height);

  context.strokeStyle = "rgba(145, 162, 148, 0.13)";
  context.lineWidth = 1;
  for (let line = 1; line <= 3; line++) {
    const y = padding.top + (plotHeight / 4) * line;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }

  const isUp = values[values.length - 1] >= values[0];
  const lineColor = isUp ? "#a3ef83" : "#ff8c86";

  if (points.length > 1) {
    const fill = context.createLinearGradient(0, padding.top, 0, height);
    fill.addColorStop(
      0,
      isUp ? "rgba(163, 239, 131, 0.21)" : "rgba(255, 140, 134, 0.18)"
    );
    fill.addColorStop(1, "rgba(16, 23, 18, 0)");

    context.beginPath();
    context.moveTo(points[0].x, height - padding.bottom);
    points.forEach((point) => context.lineTo(point.x, point.y));
    context.lineTo(points[points.length - 1].x, height - padding.bottom);
    context.closePath();
    context.fillStyle = fill;
    context.fill();

    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.strokeStyle = lineColor;
    context.lineWidth = 2.5;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();
  }

  const last = points[points.length - 1];
  context.beginPath();
  context.arc(last.x, last.y, 4, 0, Math.PI * 2);
  context.fillStyle = lineColor;
  context.fill();
}

function render() {
  renderStockOptions();
  renderMarket();
  renderPortfolio();
  renderSelectedStock();
  renderSummary();
  drawChart();
  saveGame();
}

function trade(action) {
  const symbol = getSelectedSymbol();
  const definition = getStockDefinition(symbol);
  const position = game.stocks[symbol];
  const quantity = Number($("quantityInput").value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    setMessage("Enter a whole number of shares greater than zero.", "negative");
    return;
  }

  const orderTotal = quantity * position.price;

  if (action === "buy") {
    if (orderTotal > game.cash) {
      setMessage(
        `Not enough cash. You need ${money(orderTotal)} but have ${money(game.cash)}.`,
        "negative"
      );
      return;
    }

    game.cash -= orderTotal;
    position.shares += quantity;
    setMessage(`Bought ${quantity} ${symbol} share${quantity === 1 ? "" : "s"}.`, "positive");
  } else {
    if (quantity > position.shares) {
      setMessage(
        `You only own ${position.shares} ${symbol} share${position.shares === 1 ? "" : "s"}.`,
        "negative"
      );
      return;
    }

    game.cash += orderTotal;
    position.shares -= quantity;
    setMessage(`Sold ${quantity} ${symbol} share${quantity === 1 ? "" : "s"}.`, "positive");
  }

  $("quantityInput").value = "1";
  render();
}

function randomNormalLike() {
  // Sum of uniform values gives a bell-shaped random number without a library.
  let total = 0;
  for (let i = 0; i < 6; i++) total += Math.random();
  return (total - 3) * 1.15;
}

function advanceDay() {
  game.day += 1;

  for (const stock of STOCKS) {
    const position = game.stocks[stock.symbol];
    position.previousPrice = position.price;

    const marketMovement = randomNormalLike() * stock.volatility;
    const marketDrift = 0.001;
    const percentMove = Math.max(-0.18, Math.min(0.18, marketMovement + marketDrift));

    position.price = Math.max(1, position.price * (1 + percentMove));
    position.history.push(position.price);
  }

  game.portfolioHistory.push(getPortfolioValue());
  game.headline = HEADLINES[Math.floor(Math.random() * HEADLINES.length)];
  setMessage(`Day ${game.day} is open. Check prices and plan your next move.`);
  render();
}

function startNewGame() {
  const confirmed = window.confirm(
    "Start a new game? This will erase your current portfolio and history."
  );

  if (!confirmed) return;

  game = createNewGame();
  $("quantityInput").value = "1";
  setMessage(game.message);
  render();
}

$("stockSelect").addEventListener("change", renderSelectedStock);
$("quantityInput").addEventListener("input", updateEstimate);
$("buyButton").addEventListener("click", () => trade("buy"));
$("sellButton").addEventListener("click", () => trade("sell"));
$("advanceButton").addEventListener("click", advanceDay);
$("newGameButton").addEventListener("click", startNewGame);
window.addEventListener("resize", drawChart);

render();
