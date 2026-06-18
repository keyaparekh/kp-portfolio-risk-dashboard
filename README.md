# Portfolio Risk Dashboard

A browser-based portfolio analytics dashboard focused on investment risk and asset allocation.

The app is designed as a general portfolio evaluator: users can replace the sample tickers with their own holdings, enter share counts, and optionally add an account total to reconcile cash, crypto, options, or broker quote timing.

## What It Shows

- Annualized return, volatility, Sharpe ratio, max drawdown, historical VaR, and historical CVaR
- Holdings-based portfolio construction using ticker selection and share counts
- Searchable ticker entry when run through the local server
- Automatic conversion from shares to market value weights using latest fetched prices
- Optional account-total reconciliation for broker totals that include cash, crypto, or options
- Cumulative performance and drawdown charts
- Return distribution with VaR tail highlighting
- Portfolio adjustment guidance based on concentration, risk contribution, diversification, and Sharpe ratio
- Scenario stress tests
- Asset correlation matrix

## Recommended Live/On-Demand Mode

Run the local server:

```bash
python3 server.py
```

Then visit:

```text
http://127.0.0.1:8082
```

In this mode, the dashboard:

- Loads the Nasdaq Trader symbol directory for ticker search
- Fetches selected ticker histories on demand
- Caches API responses locally for faster repeat use
- Uses the latest available Yahoo chart price for market value

## Public Deployment

This project is ready to deploy as a small Python web service.

### Render

1. Create a new GitHub repository and upload this folder.
2. Go to Render and choose **New > Blueprint**.
3. Connect the repository.
4. Render will read `render.yaml` and start the app with `python3 server.py`.

The public URL will look like:

```text
https://kp-portfolio-risk-dashboard.onrender.com
```

### Railway

1. Create a new Railway project from the GitHub repository.
2. Railway will use the `Procfile`.
3. The start command is:

```bash
python3 server.py
```

The server reads the hosting platform's `PORT` variable automatically.

## Static Data Refresh

The dashboard uses adjusted daily closes for a sample set of ETFs and stocks including SPY, QQQ, VOO, BND, GLD, TLT, SGOV, AAPL, MSFT, NVDA, TSLA, AMZN, META, GOOGL, JPM, GS, BLK, and BRK-B. In live mode, users can request additional listed tickers on demand.

```bash
python3 scripts/fetch_market_data.py
```

This writes `market-data.js`, which the browser dashboard reads directly when opened as a plain HTML file.

## How To Run

Open `index.html` in a browser for the static fallback, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Notes

Market data is pulled from Yahoo Finance's chart endpoint and ticker metadata comes from Nasdaq Trader. This is suitable for a portfolio project prototype, but production workflows should use a licensed data source or approved market data vendor.
