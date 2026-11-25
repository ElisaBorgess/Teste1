import React from 'react';
import {Composition} from 'remotion';
import {Reel, ReelData} from './Reel';

// cada reel é um JSON em src/reels/ (gerado pelo build_reel.py)
const ctx = (require as any).context('./reels', false, /\.json$/);
const reels: ReelData[] = ctx.keys().map((k: string) => ctx(k));

export const Root: React.FC = () => (
  <>
    {reels.map((r) => (
      <Composition
        key={r.id}
        id={r.id}
        component={Reel}
        durationInFrames={Math.round(r.total * 30)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={r}
      />
    ))}
  </>
);
