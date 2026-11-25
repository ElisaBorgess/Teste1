"""Lê plano.json e transcricoes/*.json e gera remotion/public/edl.json.
plano.json:
{"segmentos": [["IMG_7179", ini_s, fim_s], ...],
 "destaques": ["palavra", ...],
 "inserts": [{"type":..., "em": ["IMG_7179", t_s], "dur": s, ...}],
 "sfx_insert": "sfx/whoosh.mp3", "musica": {"src":..., "vol":0.08}}
"""
import json, re, sys
B = '/home/user/edicao'
FPS = 30
GAP = 0.30      # pausa maior que isso vira corte
PAD_I, PAD_F = 0.06, 0.12
plano = json.load(open(f'{B}/plano.json'))
trans = {}
def words(n):
    if n not in trans: trans[n] = json.load(open(f'{B}/transcricoes/{n}.json'))
    return trans[n]

clips, caps, mapa = [], [], []   # mapa: (arquivo, src_ini, src_fim, out_ini_frame)
out = 0
zoom_i = 0
dest = {d.lower() for d in plano.get('destaques', [])}
corr = plano.get('correcoes', {})
def txt(w):
    t = w.strip('.,;!?…').strip()
    return corr.get(t.lower(), t).upper()
for n, a, b in plano['segmentos']:
    ws = [w for w in words(n) if w['s'] >= a - 0.05 and w['e'] <= b + 0.05]
    if not ws: continue
    # agrupa em blocos falados sem pausa longa
    blocos, cur = [], [ws[0]]
    for w in ws[1:]:
        if w['s'] - cur[-1]['e'] > GAP: blocos.append(cur); cur = [w]
        else: cur.append(w)
    blocos.append(cur)
    for bl in blocos:
        si = max(a, bl[0]['s'] - PAD_I); sf = min(b, bl[-1]['e'] + PAD_F)
        f0 = round(si * FPS); f1 = round(sf * FPS)
        dur = f1 - f0
        if dur < 6: continue
        z = [1.0, 1.13][zoom_i % 2]; zoom_i += 1
        clips.append({'src': f'{n}.mp4', 'from': f0, 'start': out, 'dur': dur, 'zoom': z})
        mapa.append((n, si, sf, out))
        # legendas: 1 a 3 palavras, até ~16 caracteres, quebra em pontuação
        g = []
        def fecha():
            if not g: return
            s = out + round((g[0]['s'] - si) * FPS)
            caps.append({'s': max(out, s), 'e': None, 'words': [{'t': txt(x['w']), 's': out + round((x['s'] - si) * FPS), 'destaque': txt(x['w']).lower().strip('-') in dest} for x in g]})
            g.clear()
        for w in bl:
            g.append(w)
            junto = ' '.join(x['w'] for x in g)
            if len(g) >= 3 or len(junto) >= 14 or re.search(r'[.,;!?…]$', w['w']): fecha()
        fecha()
        out += dur
# fim de cada legenda = início da próxima (ou +1s)
for i, c in enumerate(caps):
    nxt = caps[i + 1]['s'] if i + 1 < len(caps) else out
    c['e'] = min(nxt, c['words'][-1]['s'] + 30) if nxt > c['s'] else c['s'] + 10
    c['e'] = max(c['e'], c['s'] + 6)
    for w in c['words']: w['s'] = max(w['s'], c['s'])

def para_saida(n, t):
    for m, si, sf, o in mapa:
        if m == n and si - 0.01 <= t <= sf + 0.01: return o + round((t - si) * FPS)
    # aproxima para o bloco mais próximo depois de t
    cands = [(si, o) for m, si, sf, o in mapa if m == n and si >= t]
    if cands: return min(cands)[1]
    raise SystemExit(f'tempo fora da edição: {n} {t}')

inserts, sfx = [], []
for ins in plano.get('inserts', []):
    s = para_saida(*ins.pop('em'))
    e = min(out, s + round(ins.pop('dur') * FPS))
    ins.update({'s': s, 'e': e}); inserts.append(ins)
    if plano.get('sfx_insert'): sfx.append({'src': plano['sfx_insert'], 's': max(0, s - 4), 'vol': 0.35})
# legenda sai de cima de cartelas e listas (o texto já está na tela)
cobre = [(i['s'], i['e']) for i in inserts if i['type'] in ('cartela', 'passos')]
caps = [c for c in caps if not any(c['s'] < e and c['e'] > s for s, e in cobre)]

edl = {'durationInFrames': out, 'clips': clips, 'caps': caps, 'inserts': inserts, 'sfx': sfx}
if plano.get('musica'): edl['musica'] = plano['musica']
json.dump(edl, open(f'{B}/remotion/public/{plano.get("saida","edl.json")}', 'w'), ensure_ascii=False)
print(f'duração {out/FPS/60:.1f} min, {len(clips)} cortes, {len(caps)} legendas, {len(inserts)} inserts')
