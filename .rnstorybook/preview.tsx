import React from 'react';
import type { Preview } from '@storybook/react';
import { StoryCanvas } from '../src/components/StoryCanvas';

const preview: Preview = {
  decorators: [(Story, context) => (
    <StoryCanvas scheme={context.parameters.scheme ?? 'light'}
      textSize={context.parameters.textSize ?? 'md'} viewport={context.parameters.viewport ?? 'phone'}
      layout={context.parameters.canvasLayout ?? 'content'}
      reduceMotion={context.parameters.reduceMotion ?? true}
      reduceTransparency={context.parameters.reduceTransparency ?? true}>
      <Story />
    </StoryCanvas>
  )],
  parameters: { controls: { expanded: true } },
};
export default preview;
