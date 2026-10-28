"""Verify chapter 10's worked examples against the guide itself.

Parses data/guides/programacao/dsa/guide.md (lines 4526 to 4965): the weighted interval table
(interval, weight, p(j), OPT(j)) and the knapsack table rows (item, K values). Recomputes each
from the parsed inputs and reports MATCH or MISMATCH against the printed rows. It also computes
the greedy and brute-force facts the figures may cite. Nothing is typed in by hand except the
guide path and the line span.

Run: python3 verify_facts.py
"""
import re
from itertools import combinations
from pathlib import Path

GUIDE = Path('/home/carloshnp/study-site/data/guides/programacao/dsa/guide.md')
LO, HI = 4526, 4965
text = '\n'.join(GUIDE.read_text(encoding='utf-8').splitlines()[LO - 1:HI])

# --- weighted interval table ---
ivals = [tuple(map(int, m)) for m in re.findall(r'\$\[(\d+),(\d+)\]\$', re.search(r'^\| interval \|.*$', text, re.M).group(0))]
weights = [int(x) for x in re.findall(r'\d+', re.search(r'^\| weight \$w_j\$ \|.*$', text, re.M).group(0))]
p_printed = [int(x) for x in re.findall(r'\d+', re.search(r'^\| \$p\(j\)\$ \|.*$', text, re.M).group(0))]
opt_printed = [int(x) for x in re.findall(r'\d+', re.search(r'^\| \$OPT\(j\)\$ \|.*$', text, re.M).group(0))]
JOBS = [(a, b, w) for (a, b), w in zip(ivals, weights)]
n = len(JOBS)

def p_of(j):  # largest index i < j with finish_i <= start_j
    s = JOBS[j - 1][0]
    return max([i for i in range(1, j) if JOBS[i - 1][1] <= s] or [0])

P = [0] + [p_of(j) for j in range(1, n + 1)]
OPT = [0] * (n + 1)
for j in range(1, n + 1):
    OPT[j] = max(OPT[j - 1], JOBS[j - 1][2] + OPT[P[j]])
print('WEIGHTED jobs (start, finish, weight):', JOBS)
print('  p(j)  recomputed', P[1:], 'printed', p_printed, '->', 'MATCH' if P[1:] == p_printed else 'MISMATCH')
print('  OPT   recomputed', OPT[1:], 'printed', opt_printed, '->', 'MATCH' if OPT[1:] == opt_printed else 'MISMATCH')

def compatible(sel):
    s = sorted(sel, key=lambda k: JOBS[k - 1][1])
    return all(JOBS[s[t] - 1][1] <= JOBS[s[t + 1] - 1][0] for t in range(len(s) - 1))

def weight(sel):
    return sum(JOBS[k - 1][2] for k in sel)

chosen, last = [], 0
for k in range(1, n + 1):
    st, fi, _ = JOBS[k - 1]
    if st >= last:
        chosen.append(k); last = fi
print('GREEDY earliest-finish chosen:', chosen, 'weight', weight(chosen), 'size', len(chosen))
subsets = [c for r in range(n + 1) for c in combinations(range(1, n + 1), r) if compatible(c)]
best_size = max(len(c) for c in subsets)
best_w = max(weight(c) for c in subsets)
print('MAX SIZE', best_size, 'sets:', [c for c in subsets if len(c) == best_size])
print('MAX WEIGHT', best_w, 'sets:', [c for c in subsets if weight(c) == best_w])
print('greedy is max-size:', len(chosen) == best_size, '| greedy weight equals optimum:', weight(chosen) == best_w)

# --- knapsack table rows ---
items = {}
for m in re.finditer(r'^\| \$i = (\d)\$ \| \$\((\d+), (\d+)\)\$ \|(.*)$', text, re.M):
    i, w, v, rest = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
    items[i] = (w, v, [int(x) for x in re.findall(r'\d+', rest)])
C = max(len(v[2]) for v in items.values()) - 1
ITEMS = [items[i][:2] for i in sorted(items)]
K = [[0] * (C + 1)]
for i, (w, v) in enumerate(ITEMS, start=1):
    K.append([K[i - 1][c] if w > c else max(K[i - 1][c], v + K[i - 1][c - w]) for c in range(C + 1)])
print('KNAPSACK items (w, v):', ITEMS, 'capacity', C)
bad = 0
for i in sorted(items):
    printed = items[i][2]
    diff = [(c, printed[c], K[i][c]) for c in range(C + 1) if printed[c] != K[i][c]]
    bad += bool(diff)
    print('  row i=%d printed %s recomputed %s -> %s' % (i, printed, K[i], 'MATCH' if not diff else 'MISMATCH (c, printed, recomputed) = %s' % diff))
print('KNAPSACK rows with mismatch:', bad)
