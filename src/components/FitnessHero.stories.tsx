import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { FitnessHero } from './FitnessHero';

const meta = { title: 'Профиль/FitnessHero', component: FitnessHero,
  parameters: { canvasLayout: 'screen' },
  args: { backLabel: 'Профиль', eyebrow: 'Физические показатели', title: 'Мои тренировки',
    stats: [{ value: '12,6', label: 'км за неделю' }, { value: '6', label: 'тренировок' }, { value: '1', label: 'на сегодня' }],
    recordLabel: 'Записать бег', historyLabel: 'История', onBack: fn(), onRecord: fn(), onHistory: fn() },
} satisfies Meta<typeof FitnessHero>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const AllDone: Story = { args: { stats: [{ value: '0', label: 'км за неделю' }, { value: '0', label: 'тренировок' }, { value: '✓', label: 'всё сделано' }] } };
export const Dark: Story = { parameters: { scheme: 'dark', canvasLayout: 'screen' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact', canvasLayout: 'screen' } };
