#!/usr/bin/env python3
import datetime as dt
import json
import os
import pathlib
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


ROOT = pathlib.Path(__file__).resolve().parent
CACHE = ROOT / ".cache"
CACHE.mkdir(exist_ok=True)
START = dt.datetime(2019, 1, 1, tzinfo=dt.timezone.utc)
SYMBOL_URLS = [
    "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt",
    "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt",
]


def get_json_response(handler, payload, status=200):
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def fetch_text(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def load_symbols():
    cache_path = CACHE / "symbols.json"
    if cache_path.exists():
      age = dt.datetime.now(dt.timezone.utc) - dt.datetime.fromtimestamp(cache_path.stat().st_mtime, tz=dt.timezone.utc)
      if age < dt.timedelta(hours=12):
          return json.loads(cache_path.read_text(encoding="utf-8"))

    symbols = {}
    for url in SYMBOL_URLS:
        text = fetch_text(url)
        lines = [line for line in text.splitlines() if line and not line.startswith("File Creation Time")]
        headers = lines[0].split("|")
        for line in lines[1:]:
            if line.startswith("Symbol|") or line.startswith("ACT Symbol|"):
                continue
            parts = line.split("|")
            if len(parts) != len(headers):
                continue
            row = dict(zip(headers, parts))
            ticker = row.get("Symbol") or row.get("ACT Symbol")
            name = row.get("Security Name") or row.get("Security Name", "")
            etf = row.get("ETF", "N") == "Y"
            test_issue = row.get("Test Issue", "N") == "Y"
            if not ticker or test_issue or ticker == "File Creation Time":
                continue
            symbols[ticker] = {
                "ticker": ticker,
                "name": name,
                "type": "ETF" if etf else "Stock",
            }

    ordered = sorted(symbols.values(), key=lambda item: item["ticker"])
    payload = {
        "source": "Nasdaq Trader symbol directory",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "symbols": ordered,
    }
    cache_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    return payload


def fetch_chart(ticker):
    safe_ticker = ticker.upper().strip()
    cache_path = CACHE / f"{safe_ticker.replace('/', '-').replace('^', '')}.json"
    if cache_path.exists():
        age = dt.datetime.now(dt.timezone.utc) - dt.datetime.fromtimestamp(cache_path.stat().st_mtime, tz=dt.timezone.utc)
        if age < dt.timedelta(minutes=20):
            return json.loads(cache_path.read_text(encoding="utf-8"))

    period1 = int(START.timestamp())
    period2 = int((dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1)).timestamp())
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(safe_ticker)}"
        f"?period1={period1}&period2={period2}&interval=1d"
        "&events=history&includeAdjustedClose=true"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
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

    latest_price = meta.get("regularMarketPrice") or (rows[-1]["adjClose"] if rows else None)
    latest_time = meta.get("regularMarketTime")
    data = {
        "ticker": safe_ticker,
        "currency": meta.get("currency", "USD"),
        "latestPrice": latest_price,
        "latestTime": latest_time,
        "rows": rows,
    }
    cache_path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    return data


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        relative = urllib.parse.urlparse(path).path.lstrip("/")
        return str(ROOT / relative)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/symbols":
            try:
                return get_json_response(self, load_symbols())
            except Exception as exc:
                return get_json_response(self, {"error": str(exc)}, 500)

        if parsed.path == "/api/market-data":
            params = urllib.parse.parse_qs(parsed.query)
            tickers = []
            for raw in params.get("tickers", []):
                tickers.extend([item.strip().upper() for item in raw.split(",") if item.strip()])
            tickers = list(dict.fromkeys(tickers))[:30]
            if not tickers:
                return get_json_response(self, {"error": "No tickers provided"}, 400)
            try:
                payload = {
                    "source": "Yahoo Finance chart endpoint",
                    "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
                    "tickers": {ticker: fetch_chart(ticker) for ticker in tickers},
                }
                return get_json_response(self, payload)
            except Exception as exc:
                return get_json_response(self, {"error": str(exc)}, 500)

        return super().do_GET()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8082"))
    host = os.environ.get("HOST", "0.0.0.0")
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Portfolio Risk Dashboard running on {host}:{port}")
    server.serve_forever()
