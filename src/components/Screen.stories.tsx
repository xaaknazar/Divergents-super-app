import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { fn } from 'storybook/test';
import { sampleCourses } from '../storybook/courseFixtures';
import { CourseCatalogGrid } from './CourseCatalogGrid';
import { LearningWelcome } from './LearningWelcome';
import { NavBarLarge } from './NavBarLarge';
import { Screen } from './Screen';
import { Wrapper } from './Wrapper';
const meta = { title: 'Навигация/Screen', component: Screen,
  parameters: { canvasLayout: 'screen' },
  args: { largeTitle: 'Обучение', onRefresh: fn(), children: <>
    <NavBarLarge title="Обучение" />
    <Wrapper paddingHorizontal={20} paddingBottom={16}><LearningWelcome courseCount={3} /></Wrapper>
    <CourseCatalogGrid courses={[...sampleCourses, ...sampleCourses.map(c => ({ ...c, id: c.id + '-copy' }))]}
      ownedProgress={{}} onCoursePress={fn()} />
  </> },
} satisfies Meta<typeof Screen>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Scrollable: Story = {};
export const NoTabs: Story = { args: { tabPadding: false } };
export const Transparent: Story = { args: { surface: 'transparent' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
