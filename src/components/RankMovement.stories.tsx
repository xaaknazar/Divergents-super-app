import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { RankMovement } from './RankMovement';
import { Wrapper } from './Wrapper';
const meta = { title: 'Челлендж/RankMovement', component: RankMovement, args: { change: 4 } } satisfies Meta<typeof RankMovement>;
export default meta;
export const States: StoryObj<typeof meta> = { render: () => <Wrapper dir="row" gap={16} padding={16}>{[4, -2, 0, null].map((change, i) => <RankMovement key={i} change={change} />)}</Wrapper> };
