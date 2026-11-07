import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { RankMedal } from './RankMedal';
import { Wrapper } from './Wrapper';
const meta = { title: 'Челлендж/RankMedal', component: RankMedal, args: { rank: 1 } } satisfies Meta<typeof RankMedal>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Places: Story = { render: () => <Wrapper dir="row" gap={16} padding={16}>{[1, 2, 3, 4, 127].map(rank => <RankMedal key={rank} rank={rank} />)}</Wrapper> };
