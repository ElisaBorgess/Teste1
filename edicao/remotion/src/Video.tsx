import React from 'react';
import {AbsoluteFill, Sequence, OffthreadVideo, Audio, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig, Easing} from 'remotion';
import {continueRender, delayRender} from 'remotion';

const SANS = 'MontserratLocal';
const SERIF = 'PlayfairLocal';
const fontes: [string, string, FontFaceDescriptors][] = [
  [SANS, 'fontes/montserrat.woff2', {weight: '100 900'}],
  [SERIF, 'fontes/playfair.woff2', {weight: '400 900'}],
  [SERIF, 'fontes/playfair-it.woff2', {weight: '400 900', style: 'italic'}],
];
if (typeof document !== 'undefined') {
  const h = delayRender('fontes');
  Promise.all(fontes.map(([n, u, d]) => new FontFace(n, `url(${staticFile(u)})`, d).load().then((ff) => (document.fonts as any).add(ff)))).then(() => continueRender(h));
}
const PAPEL = '#EFE9DF';
const TINTA = '#1E1E1E';

type Clip = {src: string; from: number; start: number; dur: number; zoom: number; zx?: number; zy?: number};
type Cap = {s: number; e: number; words: {t: string; s: number; destaque?: boolean}[]};
type Insert = {type: 'imagem' | 'video' | 'cartela' | 'passos'; s: number; e: number; src?: string; titulo?: string; sub?: string; itens?: string[]; ativo?: number};
type Sfx = {src: string; s: number; vol?: number};
export type Props = {durationInFrames: number; clips: Clip[]; caps: Cap[]; inserts: Insert[]; sfx: Sfx[]; musica?: {src: string; vol: number}};

const ClipView: React.FC<{c: Clip}> = ({c}) => {
  const f = useCurrentFrame();
  // leve deriva dentro do plano fechado, para não parecer congelado
  const drift = c.zoom > 1 ? interpolate(f, [0, c.dur], [0, 0.015]) : 0;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile(c.src)}
        startFrom={c.from}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${c.zoom + drift})`, transformOrigin: `${(c.zx ?? 0.5) * 100}% ${(c.zy ?? 0.4) * 100}%`}}
      />
    </AbsoluteFill>
  );
};

const Legenda: React.FC<{c: Cap}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: f, fps, config: {damping: 14, stiffness: 260, mass: 0.6}});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 170}}>
      <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 92, lineHeight: 1.05, textTransform: 'uppercase', color: 'white', textAlign: 'center', maxWidth: 1400, letterSpacing: -1,
        textShadow: '0 4px 18px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.8)', transform: `scale(${interpolate(pop, [0, 1], [0.82, 1])})`}}>
        {c.words.map((w, i) => (
          <span key={i} style={{opacity: f >= w.s - c.s ? 1 : 0, color: w.destaque ? '#FFE15A' : 'white'}}>{w.t}{' '}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Papel: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: PAPEL}}>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.35), rgba(0,0,0,0.10))'}} />
    {children}
  </AbsoluteFill>
);

const Orbita: React.FC<{p: number}> = ({p}) => (
  <svg width={1920} height={1080} style={{position: 'absolute'}}>
    {[0, 1].map((k) => (
      <ellipse key={k} cx={960} cy={540} rx={620 - k * 40} ry={300 - k * 26} fill="none" stroke={TINTA} strokeWidth={1.6} strokeOpacity={0.7 - k * 0.3}
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} transform={`rotate(${k ? -6 : 4} 960 540)`} />
    ))}
  </svg>
);

const InsertView: React.FC<{i: Insert}> = ({i}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dur = i.e - i.s;
  const fade = interpolate(f, [0, 5, dur - 5, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const p = interpolate(f, [0, 22], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  if (i.type === 'imagem' || i.type === 'video') {
    const z = interpolate(f, [0, dur], [1.0, 1.08]);
    return (
      <AbsoluteFill style={{opacity: fade}}>
        <Papel>
          {i.type === 'imagem'
            ? <Img src={staticFile(i.src!)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />
            : <OffthreadVideo src={staticFile(i.src!)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
        </Papel>
      </AbsoluteFill>
    );
  }
  if (i.type === 'cartela') {
    return (
      <AbsoluteFill style={{opacity: fade}}>
        <Papel>
          <Orbita p={p} />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 18}}>
            <div style={{fontFamily: SERIF, fontWeight: 500, fontSize: (i.titulo ?? '').length > 16 ? 70 : 96, color: TINTA, letterSpacing: (i.titulo ?? '').length > 16 ? 3 : 6, whiteSpace: 'nowrap', textTransform: 'uppercase', textAlign: 'center', maxWidth: 1100,
              opacity: p, transform: `translateY(${(1 - p) * 20}px)`}}>{i.titulo}</div>
            {i.sub && <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 44, color: TINTA, opacity: interpolate(f, [12, 30], [0, 0.8], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>{i.sub}</div>}
          </AbsoluteFill>
        </Papel>
      </AbsoluteFill>
    );
  }
  // passos: nós numerados ao longo de uma curva
  const n = i.itens!.length;
  const pts = i.itens!.map((_, k) => ({x: 300 + (k * 1320) / Math.max(1, n - 1), y: 600 - Math.sin((k / Math.max(1, n - 1)) * Math.PI) * 180}));
  const d = pts.map((q, k) => (k ? `L${q.x},${q.y}` : `M${q.x},${q.y}`)).join(' ');
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Papel>
        {i.titulo && <div style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: 64, letterSpacing: 4, textTransform: 'uppercase', color: TINTA}}>{i.titulo}</div>}
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          <path d={d} fill="none" stroke={TINTA} strokeWidth={1.6} strokeDasharray="6 8" opacity={0.6} />
        </svg>
        {pts.map((q, k) => {
          const a = spring({frame: f - k * 8, fps, config: {damping: 16}});
          const on = i.ativo === undefined || i.ativo === k;
          return (
            <div key={k} style={{position: 'absolute', left: q.x - 200, top: q.y - 46, width: 400, textAlign: 'center', opacity: a * (on ? 1 : 0.35), transform: `scale(${a})`}}>
              <div style={{margin: '0 auto', width: 92, height: 92, borderRadius: 46, border: `2px solid ${TINTA}`, background: on ? TINTA : 'transparent', color: on ? PAPEL : TINTA,
                fontFamily: SERIF, fontSize: 48, lineHeight: '88px'}}>{k + 1}</div>
              <div style={{marginTop: 18, fontFamily: SERIF, fontSize: 38, color: TINTA}}>{i.itens![k]}</div>
            </div>
          );
        })}
      </Papel>
    </AbsoluteFill>
  );
};

export const Video: React.FC<{data: Props}> = ({data}) => (
  <AbsoluteFill style={{background: 'black'}}>
    {data.clips.map((c, k) => (
      <Sequence key={'c' + k} from={c.start} durationInFrames={c.dur}><ClipView c={c} /></Sequence>
    ))}
    {data.inserts.map((i, k) => (
      <Sequence key={'i' + k} from={i.s} durationInFrames={i.e - i.s}><InsertView i={i} /></Sequence>
    ))}
    {data.caps.map((c, k) => (
      <Sequence key={'l' + k} from={c.s} durationInFrames={c.e - c.s}><Legenda c={c} /></Sequence>
    ))}
    {data.sfx.map((s, k) => (
      <Sequence key={'s' + k} from={s.s}><Audio src={staticFile(s.src)} volume={s.vol ?? 0.5} /></Sequence>
    ))}
    {data.musica && <Audio src={staticFile(data.musica.src)} volume={data.musica.vol} loop />}
  </AbsoluteFill>
);
