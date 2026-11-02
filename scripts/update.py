"""Aplica la compra mensual del plan a los datos `const D=...` de index.html.

Por cada mes pendiente (desde el ultimo registrado en D.monthly hasta el mes en
curso, si ya es dia 2 o posterior) suma a cada activo las unidades
importe_usd / precio_actual_usd y el importe al coste. Uso:
    python scripts/update.py [--dry-run]
"""
import json, re, sys, datetime as dt, urllib.request

HTML = "index.html"
PLAN = {"IUSQ.DE": 100, "CSPX.L": 100, "CNDX.L": 105, "ICGA.DE": 25, "PPFB.DE": 25,
        "TSM": 25, "WSLV.L": 25, "MEUS.L": 25, "IJPA.L": 25}
APPLY_FROM_DAY = 2


def chart(sym):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=5d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        meta = json.load(r)["chart"]["result"][0]["meta"]
    return meta["regularMarketPrice"], meta["currency"]


def to_usd(price, cur, eurusd, gbpusd):
    if cur == "USD": return price
    if cur == "EUR": return price * eurusd
    if cur == "GBp": return price / 100 * gbpusd
    if cur == "GBP": return price * gbpusd
    raise ValueError(f"moneda no soportada: {cur}")


def pending_months(last, today):
    y, m = map(int, last.split("-"))
    out = []
    while True:
        m += 1
        if m > 12: y, m = y + 1, 1
        if (y, m) > (today.year, today.month): break
        if (y, m) == (today.year, today.month) and today.day < APPLY_FROM_DAY: break
        out.append(f"{y}-{m:02d}")
    return out


def main():
    dry = "--dry-run" in sys.argv
    src = open(HTML, encoding="utf-8").read()
    mt = re.search(r"^const D=(\{.*\})\s*$", src, re.M)
    D = json.loads(mt.group(1))
    months = pending_months(D["monthly"][-1][0], dt.datetime.now(dt.timezone.utc).date())
    if not months:
        print("Nada pendiente."); return
    eurusd, _ = chart("EURUSD=X"); gbpusd, _ = chart("GBPUSD=X")
    px = {t: to_usd(*chart(t), eurusd, gbpusd) for t in PLAN}
    total = sum(PLAN.values())
    by_t = {a["t"]: a for a in D["assets"]}
    for mo in months:
        for t, amt in PLAN.items():
            by_t[t]["u"] = round(by_t[t]["u"] + amt / px[t], 6)
            by_t[t]["cost"] = round(by_t[t]["cost"] + amt, 2)
        D["monthly"].append([mo, float(total), 0.0])
        D["monthlyFlows"].append([mo, float(total), 0.0, float(total)])
        print(f"{mo}: +{total} $ ->", {t: round(PLAN[t] / px[t], 4) for t in PLAN})
    if dry: return
    new = "const D=" + json.dumps(D, ensure_ascii=False, separators=(",", ":"))
    open(HTML, "w", encoding="utf-8").write(src[:mt.start()] + new + src[mt.end():])


main()
