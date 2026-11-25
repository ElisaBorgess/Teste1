"""Gera src/reels/<id>.json a partir de uma especificação de cortes.
Uso: python3 tools/build_reel.py spec.json WORDS_DIR
spec: {id, title:{sans,serif,end?}, cuts:[[clip,from,to],...], keys:[...], fix:{errado:certo},
       inserts:[{src,kind,at_word|at,nth?,dur,from?,offset?}], gap?}
"""
import json, sys, re, unicodedata
spec = json.load(open(sys.argv[1])); WD = sys.argv[2]
GAP = spec.get('gap', 0.32); PRE, POST = 0.08, 0.14
norm = lambda s: re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode())
keys = {norm(k) for k in spec.get('keys', [])}
fix = spec.get('fix', {})
import subprocess, os
AUD = os.path.join(os.path.dirname(WD.rstrip('/')), 'audio')
_sil = {}
def silences(clip):
    if clip not in _sil:
        out = subprocess.run(['ffmpeg','-nostdin','-i',f'{AUD}/IMG_{clip}.wav','-af','silencedetect=n=-34dB:d=0.28','-f','null','-'],capture_output=True,text=True).stderr
        st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
        en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
        _sil[clip] = [(a+0.07, b-0.09) for a, b in zip(st, en) if b-a > 0.28]
    return _sil[clip]
def pieces(clip, s0, s1, starts):
    """divide [s0,s1] removendo silencios internos (só onde não começa palavra)"""
    out, cur = [], s0
    for a, b in silences(clip):
        if any(a - 0.05 <= t <= b + 0.02 for t in starts): continue
        if a > cur and b < s1 and a < s1:
            out.append((cur, a)); cur = b
    out.append((cur, s1))
    return [(a, b) for a, b in out if b - a > 0.12]
clips, words, acc, z = [], [], 0.0, 0
for cut in spec['cuts']:
    clip, a, b = cut[:3]; opt = cut[3] if len(cut) > 3 else {}
    ws = [w for w in json.load(open(f'{WD}/{clip}.json')) if w[0] >= a - 0.05 and w[0] < b and not any(abs(w[0]-d[0]) < 0.06 and w[2].startswith(d[1]) for d in opt.get('drop', []))]
    if not ws: continue
    # subcortes: quebra nos silêncios
    runs = [[ws[0]]]
    for w in ws[1:]:
        if w[0] - runs[-1][-1][1] > GAP: runs.append([w])
        else: runs[-1].append(w)
    for r in runs:
        s0 = max(a, r[0][0] - PRE); s1 = min(b + 0.35, r[-1][1] + POST)
        if s1 <= s0: continue
        zoom = 1.0 if z % 2 == 0 else 1.09; z += 1
        ps = pieces(clip, s0, s1, [w[0] for w in r])
        def tl(x):  # tempo da fonte -> tempo da timeline
            o = acc
            for pa, pb in ps:
                if x < pa: return o
                if x <= pb: return o + x - pa
                o += pb - pa
            return o
        first = True
        for w in r:
            txt = w[2]
            for k, v in fix.items(): txt = re.sub(k, v, txt)
            if not txt.strip(): continue
            words.append({'t': round(tl(w[0]), 3), 'e': round(tl(w[1]), 3), 'w': txt, 'k': norm(txt) in keys, 'b': first and r is runs[0]})
            first = False
        for pa, pb in ps:
            clips.append({'src': f'{clip}.mp4', 'from': round(pa, 3), 'dur': round(pb - pa, 3), 'zoom': zoom})
            acc += pb - pa
# juntar palavras-chave compostas: marcar sequências listadas como "a b"
for k in spec.get('keys', []):
    parts = [norm(p) for p in k.split()]
    if len(parts) < 2: continue
    for i in range(len(words) - len(parts) + 1):
        if [norm(words[i + j]['w']) for j in range(len(parts))] == parts:
            for j in range(len(parts)): words[i + j]['k'] = True
# grupos de legenda
groups, cur = [], []
for i, w in enumerate(words):
    if cur:
        prev = words[cur[-1]]
        brk = w.get('b') or (len(cur) >= 3 and not (prev['k'] and w['k'])) or len(cur) >= 5 or w['t'] - prev['e'] > 0.25 or (prev['k'] and not w['k']) or prev['w'].endswith(('.', '?', '!', ','))
        if brk: groups.append(cur); cur = []
    cur.append(i)
if cur: groups.append(cur)
total = round(acc + 0.5, 3)
def find(at_word, nth=1):
    n = 0; parts = [norm(p) for p in at_word.split()]
    for i in range(len(words)):
        if [norm(words[i + j]['w']) if i + j < len(words) else '' for j in range(len(parts))] == parts:
            n += 1
            if n == nth: return words[i]['t']
    raise SystemExit(f'nao achei: {at_word}')
ins = []
for x in spec.get('inserts', []):
    at = x['at'] if 'at' in x else find(x['at_word'], x.get('nth', 1)) + x.get('offset', 0)
    ins.append({'src': x['src'], 'kind': x.get('kind', 'video'), 'at': round(at, 3), 'dur': x['dur'], 'from': x.get('from', 0)})
title = dict(spec['title']); title.setdefault('end', spec['title'].get('end', min(8.0, total)))
out = {'id': spec['id'], 'title': title, 'clips': clips, 'inserts': ins, 'words': words, 'groups': groups, 'ctaStart': total - 1.4, 'total': total}
json.dump(out, open(f"src/reels/{spec['id']}.json", 'w'), ensure_ascii=False, indent=1)
print(spec['id'], f'{total:.1f}s', len(clips), 'cortes')
print(' | '.join(f"{w['t']:.1f}:{w['w']}" for w in words))
