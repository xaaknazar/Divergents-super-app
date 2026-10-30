import type { Meta,StoryObj } from '@storybook/react-native';
import React from 'react';
import { ListRow } from './ListRow';
import { ListSection } from './ListSection';
import { Wrapper } from './Wrapper';

const meta = {
  title: 'Списки/ListSection', component: ListSection,
  args: { header: 'Мои активности', footer: 'Сохранённые результаты доступны в профиле.',
    children: <><ListRow title="Программы" detail="3" chevron /><ListRow title="Книги" detail="12" chevron /></> },
  decorators: [(Story) => <Wrapper marginHorizontal={16} marginTop={6}><Story /></Wrapper>],
} satisfies Meta<typeof ListSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithoutHeading: Story = { args: { header: undefined, footer: undefined } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
