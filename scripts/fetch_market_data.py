#!/usr/bin/env python3
import datetime as dt
import json
import pathlib
import urllib.request


TICKERS = [
    "ANET",
    "SPHR",
    "ASML",
    "NVDA",
    "QQQ",
    "LAES",
    "MU",
    "OKLO",
    "AMD",
    "PLTR",
    "RIVN",
    "SPY",
    "TLT",
    "IEF",
    "BIL",
    "GLD",
    "XLV",
    "XLF",
    "VNQ",
    "EFA",
    "AAPL",
    "MSFT",
    "AMZN",
    "META",
    "GOOGL",
    "JPM",
    "GS",
    "BLK",
    "BRK-B",
]
START = dt.datetime(2019, 1, 1, tzinfo=dt.timezone.utc)
END = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1)
OUT = pathlib.Path(__file__).resolve().parents[1] / "market-data.js"


def fetch_chart(ticker):
    period1 = int(START.timestamp())
    period2 = int(END.timestamp())
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        f"?period1={period1}&period2={period2}&interval=1d"
        "&events=history&includeAdjustedClose=true"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.load(response)

    result = payload["chart"]["result"][0]
    meta = result.get("meta", {})
    timestamps = result["timestamp"]
    closes = result["indicators"]["adjclose"][0]["adjclose"]
    rows = []
    for timestamp, close in zip(timestamps, closes):
        if close is None:
            continue
        date = dt.datetime.fromtimestamp(timestamp, tz=dt.timezone.utc).date().isoformat()
        rows.append({"date": date, "adjClose": round(float(close), 6)})
    return {
        "ticker": ticker,
        "currency": meta.get("currency", "USD"),
        "latestPrice": meta.get("regularMarketPrice") or (rows[-1]["adjClose"] if rows else None),
        "latestTime": meta.get("regularMarketTime"),
        "rows": rows,
    }


def main():
    data = {
        "source": "Yahoo Finance chart API",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "tickers": {},
    }
    for ticker in TICKERS:
        item = fetch_chart(ticker)
        if len(item["rows"]) < 100:
            raise RuntimeError(f"Not enough data for {ticker}")
        data["tickers"][ticker] = item

    OUT.write_text(
        "window.MARKET_DATA = " + json.dumps(data, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT}")
    for ticker, item in data["tickers"].items():
        rows = item["rows"]
        print(f"{ticker}: {len(rows)} rows, {rows[0]['date']} to {rows[-1]['date']}, latest {item['latestPrice']}")


if __name__ == "__main__":
    main()
