import React from 'react';
import {Composition, staticFile} from 'remotion';
import {Video, Props} from './Video';

export const Root: React.FC = () => (
  <Composition
    id="Video"
    component={Video}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={300}
    defaultProps={{edl: 'edl.json'} as any}
    calculateMetadata={async ({props}: any) => {
      const data: Props = await fetch(staticFile(props.edl)).then((r) => r.json());
      return {durationInFrames: data.durationInFrames, props: {...props, data}};
    }}
  />
);
