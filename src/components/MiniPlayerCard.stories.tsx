import React from 'react';
import { Image, Text, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { MiniPlayerCard } from './MiniPlayerCard';
const meta = {
  title: 'Обучение/MiniPlayerCard', component: MiniPlayerCard,
  args: { title: 'Тренинг', courseTitle: '4 параметра руководителя', kind: 'lesson', playing: true,
    progress: 0.35, onOpen: fn(), onToggle: fn(), onClose: fn() },
  parameters: { reduceTransparency: false },
} satisfies Meta<typeof MiniPlayerCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playing: Story = {};
export const Paused: Story = { args: { playing: false } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const DownloadedAudio: Story = { args: { kind: 'download' } };
export const Compact: Story = { args: { title: 'Очень длинное название текущего урока', courseTitle: 'Полный курс личностного развития' }, parameters: { viewport: 'compact' } };
export const LargeText: Story = { parameters: { textSize: 'xl' } };
export const ReducedTransparency: Story = { parameters: { reduceTransparency: true } };

/** Put real image detail behind the glass: a plain Storybook canvas hides transmission. */
export const OverContent: Story = {
  render: args => <View style={{ gap: 24 }}>
    {[false, true].map(dark => <View key={String(dark)} style={{ height: 240, backgroundColor: dark ? '#0B1020' : '#F2F3F7', borderRadius: 24, overflow: 'hidden', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
        <Image source={require('../../assets/design/reading/engraving-light.png')} style={{ width: '50%', height: '100%' }} resizeMode="cover" />
        <Image source={require('../../assets/design/reading/engraving-dark.png')} style={{ width: '50%', height: '100%' }} resizeMode="cover" />
      </View>
      <View style={{ padding: 12 }}><MiniPlayerCard {...args} playing={!dark} /></View>
      <Text style={{ position: 'absolute', bottom: 14, left: 16, color: '#fff', backgroundColor: '#17233B', padding: 6, borderRadius: 6 }}>Стекло поверх обложек · {dark ? 'пауза' : 'воспроизведение'}</Text>
    </View>)}
    <MiniPlayerCard {...args} />
  </View>,
};
export const OverContentReducedTransparency: Story = { ...OverContent, parameters: { reduceTransparency: true } };
