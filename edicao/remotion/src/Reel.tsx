import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export type Clip = {src: string; from: number; dur: number; zoom?: number; ty?: number};
export type Insert = {src: string; at: number; dur: number; from?: number; kind: 'video' | 'image'};
export type Word = {t: number; e: number; w: string; k?: boolean};
export type ReelData = {
  id: string;
  title: {sans: string[]; serif: string; end: number};
  clips: Clip[];
  inserts: Insert[];
  words: Word[];
  groups: number[][];
  ctaStart: number;
  total: number;
};

const FPS = 30;
const GOLD = '#EED9A2';
const fontCss = `
@font-face{font-family:'Inst';src:url(${staticFile('instrument-serif-latin-400-italic.woff2')}) format('woff2');font-style:italic;}
@font-face{font-family:'InterR';src:url(${staticFile('inter-latin-600-normal.woff2')}) format('woff2');font-weight:600;}
@font-face{font-family:'InterR';src:url(${staticFile('inter-latin-700-normal.woff2')}) format('woff2');font-weight:700;}`;
const shadow = '0 2px 10px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.4)';

const MainTrack: React.FC<{clips: Clip[]}> = ({clips}) => {
  let acc = 0;
  return (
    <>
      {clips.map((c, i) => {
        const start = Math.round(acc * FPS);
        const len = Math.round((acc + c.dur) * FPS) - start;
        acc += c.dur;
        return (
          <Sequence key={i} from={start} durationInFrames={len}>
            <AbsoluteFill style={{transform: `translateY(${c.ty ?? 0}px) scale(${c.zoom ?? 1})`}}>
              <OffthreadVideo src={staticFile(c.src)} startFrom={Math.round(c.from * FPS)} volume={(f) => Math.min(1, (f + 1) / 2, (len - f) / 2)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </>
  );
};

const InsertLayer: React.FC<{ins: Insert}> = ({ins}) => {
  const f = useCurrentFrame();
  const len = Math.round(ins.dur * FPS);
  const opacity = interpolate(f, [0, 3, len - 8, len], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = interpolate(f, [0, len], [1.0, 1.08]);
  return (
    <AbsoluteFill style={{opacity, backgroundColor: '#000'}}>
      <AbsoluteFill style={{transform: `scale(${scale})`}}>
        {ins.kind === 'video' ? (
          <OffthreadVideo muted src={staticFile(ins.src)} startFrom={Math.round((ins.from ?? 0) * FPS)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        ) : (
          <Img src={staticFile(ins.src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Title: React.FC<{title: ReelData['title']}> = ({title}) => {
  const f = useCurrentFrame();
  const endF = Math.round(title.end * FPS);
  const o = interpolate(f, [0, 8, endF - 6, endF], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', top: 250, left: 60, right: 60, textAlign: 'center', opacity: o}}>
      {title.sans.map((l, i) => (
        <div key={i} style={{fontFamily: 'InterR', fontWeight: 700, fontSize: 44, lineHeight: 1.15, color: '#fff', textShadow: shadow, letterSpacing: -0.3}}>{l}</div>
      ))}
      {title.serif ? (
        <div style={{fontFamily: 'Inst', fontStyle: 'italic', fontSize: 82, lineHeight: 1.0, color: GOLD, textShadow: shadow, marginTop: 2}}>{title.serif}</div>
      ) : null}
    </div>
  );
};

const Captions: React.FC<{words: Word[]; groups: number[][]}> = ({words, groups}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const gi = groups.findIndex((g, i) => {
    const s = words[g[0]].t;
    const next = groups[i + 1] ? words[groups[i + 1][0]].t : words[g[g.length - 1]].e + 0.6;
    const e = Math.min(next, words[g[g.length - 1]].e + 0.6);
    return t >= s - 0.04 && t < e;
  });
  if (gi < 0) return null;
  const g = groups[gi];
  // linhas: palavras-chave ficam sozinhas em serif grande; o resto em sans pequena
  const lines: {key: boolean; idx: number[]}[] = [];
  for (const i of g) {
    const k = !!words[i].k;
    const last = lines[lines.length - 1];
    if (last && last.key === k) last.idx.push(i);
    else lines.push({key: k, idx: [i]});
  }
  return (
    <div style={{position: 'absolute', top: 1180, left: 50, right: 50, textAlign: 'center'}}>
      {lines.map((ln, li) => (
        <div key={li} style={{lineHeight: ln.key ? 1.0 : 1.25}}>
          {ln.idx.map((i) => {
            const w = words[i];
            const spoken = t >= w.t - 0.03;
            const pop = spring({frame: f - Math.round(w.t * fps), fps, config: {damping: 14, stiffness: 180}});
            const style: React.CSSProperties = ln.key
              ? {fontFamily: 'Inst', fontStyle: 'italic', fontSize: 104, color: GOLD, transform: `scale(${0.9 + 0.1 * pop})`, display: 'inline-block'}
              : {fontFamily: 'InterR', fontWeight: 600, fontSize: 40, color: '#fff'};
            return (
              <span key={i} style={{...style, opacity: spoken ? 1 : 0.35, textShadow: shadow, margin: '0 7px'}}>
                {w.w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const EndFade: React.FC<{start: number; total: number}> = ({start, total}) => {
  const f = useCurrentFrame();
  const o = interpolate(f / FPS, [start, total], [0, 0.82], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{backgroundColor: `rgba(0,0,0,${o})`}} />;
};

export const Reel: React.FC<ReelData> = (r) => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <style>{fontCss}</style>
    <MainTrack clips={r.clips} />
    {r.inserts.map((ins, i) => (
      <Sequence key={i} from={Math.round(ins.at * FPS)} durationInFrames={Math.round(ins.dur * FPS)}>
        <InsertLayer ins={ins} />
      </Sequence>
    ))}
    <EndFade start={r.total - 1.4} total={r.total} />
    <Title title={r.title} />
    <Captions words={r.words} groups={r.groups} />
  </AbsoluteFill>
);
