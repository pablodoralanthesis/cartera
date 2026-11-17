"""Extrae del texto del extracto eToro (Account Activity + resumen) las posiciones abiertas, los flujos mensuales
y las cifras oficiales, y escribe statement.json para build.js.  Uso: parse_statement.py st.txt statement.json"""
import re, sys, json, collections
txt = open(sys.argv[1], encoding='utf-8').read()
a = txt.index('Account Activity JAN'); b = txt.index('Dividends JAN', a)
act = txt[a:b]
act = re.sub(r'Deposit\n([^\n]*)\n([^\n]*)\n(?=[\d(])', r'Deposit \1 \2 ', act)   # depósitos partidos en 4 líneas
num = r'\(?-?[\d,]+\.\d+\)?'
def f(s):
    s = s.replace(',', '')
    return -float(s[1:-1]) if s.startswith('(') else float(s)
NAMES = {'CNDX.L': 'iShares NASDAQ 100', 'CSPX.L': 'iShares Core S&P 500', 'IUSQ.DE': 'iShares MSCI ACWI', 'TSM': 'Taiwan Semiconductor ADR',
         'PPFB.DE': 'iShares Physical Gold ETC', 'MEUS.L': 'Amundi Core STOXX Europe 600', 'WSLV.L': 'WisdomTree Physical Silver', 'SAP.DE': 'SAP',
         'IJPA.L': 'iShares MSCI Japan', 'ICGA.DE': 'iShares MSCI China', 'MC.PA': 'LVMH'}
ORDER = list(NAMES)
opens, closed = {}, set()
for m in re.finditer(r'(\d\d-\d\d-\d\d\d\d) \d\d:\d\d:\d\d Open Position (\S+) (%s) (%s) (%s) (%s) (%s) (\d+) (\S+)' % ((num,) * 5), act):
    d, sym, amt, units, chg, bal, cash, pid, typ = m.groups()
    opens[pid] = dict(date=d, sym=sym, amt=f(amt), units=f(units))
for m in re.finditer(r'Position closed (\S+) (%s) (%s) (%s) (%s) (%s) (\d+)' % ((num,) * 5), act):
    closed.add(m.group(7))
flows = collections.defaultdict(lambda: [0.0, 0.0, 0.0])
for m in re.finditer(r'(\d\d)-(\d\d)-(\d\d\d\d) \d\d:\d\d:\d\d Deposit (?!Conversion)(.*?) (%s) - (%s) ' % (num, num), act):
    flows[m.group(3) + '-' + m.group(2)][0] += f(m.group(5))
for m in re.finditer(r'(\d\d)-(\d\d)-(\d\d\d\d) \d\d:\d\d:\d\d Transfer: \S+ > \S+ \S+ (%s) - (%s) ' % (num, num), act):
    flows[m.group(3) + '-' + m.group(2)][1] += f(m.group(4))
for p in opens.values():
    d = p['date']; flows[d[6:] + '-' + d[3:5]][2] += p['amt']
net = collections.defaultdict(lambda: dict(units=0.0, cost=0.0))
for pid, p in opens.items():
    if pid in closed: continue
    t = p['sym'].split('/')[0].upper()
    net[t]['units'] += p['units']; net[t]['cost'] += p['amt']
unknown = [t for t in net if t not in NAMES]
if unknown: sys.exit('Tickers sin nombre: %s' % unknown)
assets = [dict(t=t, n=NAMES[t], u=round(net[t]['units'], 6), cost=round(net[t]['cost'], 2), cc='USD', quote=t) for t in ORDER if t in net]
def summary(label):
    m = re.search(re.escape(label) + r' (%s) (%s|N/A)' % (num, num), txt)
    return (f(m.group(1)), None if m.group(2) == 'N/A' else f(m.group(2))) if m else (None, None)
S = {k: summary(k) for k in ['Deposits', 'Transfer to Trading (from eToro Money)', 'Adjustments', 'Profit or Loss (Closed positions only)', 'Dividends',
                             'Opening and Closing Spread', 'Withdrawals', 'Transfer to eToro Money (from Trading)', 'Deposit/Withdrawal FX Conversion Fee',
                             'Ending Realized Equity', 'Ending Unrealized Equity']}
period = re.search(r'Account Summary (\w{3}) (\d+), (\d{4}) to\s+(\w{3}) (\d+), (\d{4})', txt)
MON = dict(JAN=1, FEB=2, MAR=3, APR=4, MAY=5, JUN=6, JUL=7, AUG=8, SEP=9, OCT=10, NOV=11, DEC=12)
end_y, end_m, end_d = int(period.group(6)), MON[period.group(4).upper()], int(period.group(5))
months = []
y, mth = int(period.group(3)), MON[period.group(1).upper()]
while (y, mth) <= (end_y, end_m):
    months.append('%d-%02d' % (y, mth)); mth += 1
    if mth > 12: mth = 1; y += 1
flows_list = [[ym] + [round(x, 2) for x in flows[ym]] for ym in months]
dep_total = round(sum(v[0] for v in flows.values()), 2)
assert abs(dep_total - S['Deposits'][0]) < 0.01, 'Depósitos no cuadran: %s vs %s' % (dep_total, S['Deposits'][0])
assert abs(sum(a['cost'] for a in assets) - S['Ending Realized Equity'][0]) < 20, 'Coste abierto vs equity realizado'
cash_usd = round(S['Ending Realized Equity'][0] - sum(a['cost'] for a in assets), 2)
out = dict(ym='%d-%02d' % (end_y, end_m), date='%d-%02d-%02d' % (end_y, end_m, end_d), dateEs='%02d/%02d/%d' % (end_d, end_m, end_y),
           equityEur=S['Ending Unrealized Equity'][1], equityUsd=S['Ending Unrealized Equity'][0],
           realizedEur=S['Ending Realized Equity'][1], realizedUsd=S['Ending Realized Equity'][0],
           cashUsd=cash_usd, cashEur=round(cash_usd * S['Ending Realized Equity'][1] / S['Ending Realized Equity'][0], 2),
           assets=assets, monthlyFlows=flows_list, monthly=[[r[0], r[1], r[2]] for r in flows_list],
           summary={k: dict(usd=v[0], eur=v[1]) for k, v in S.items()},
           positions_open=len(opens) - len([p for p in opens if p in closed]), positions_closed=len(closed))
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK depósitos', dep_total, '| coste abierto', round(sum(a['cost'] for a in assets), 2), '| efectivo', cash_usd, '| equity', S['Ending Unrealized Equity'])
for a in assets: print(' %-8s %12.6f u  %9.2f $' % (a['t'], a['u'], a['cost']))
