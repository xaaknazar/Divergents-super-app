import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { ScrollHeaderLayout, scrollHeaderContentInset } from './ScrollHeaderLayout';
import { ScreenDescription } from './ScreenDescription';
import { Wrapper } from './Wrapper';
import { NavHeader } from './NavHeader';
const meta = { title: 'Навигация/ScrollHeaderLayout', component: ScrollHeaderLayout,
  parameters: { canvasLayout: 'screen' }, args: { header: <NavHeader title="История" onBack={() => {}} />,
    children: height => <ScrollView contentContainerStyle={scrollHeaderContentInset(height, { padding: 16 })}>
      {Array.from({ length: 30 }, (_, n) => <Wrapper key={n} paddingVertical={18}><ScreenDescription text={`Запись ${n + 1}`} /></Wrapper>)}
    </ScrollView>,
  },
} satisfies Meta<typeof ScrollHeaderLayout>;
export default meta;
export const Light: StoryObj<typeof meta> = {};
export const Dark: StoryObj<typeof meta> = { parameters: { scheme: 'dark' } };
export const LargeText: StoryObj<typeof meta> = { parameters: { textSize: 'xl', viewport: 'compact' } };
