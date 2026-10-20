import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { EmptyState } from './EmptyState';
const meta = { title: 'Состояния/EmptyState', component: EmptyState, args: { title: 'Курсы скоро появятся', subtitle: 'Каталог обновляется — загляните чуть позже.' },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const FilterRecovery: Story = { args: { icon: 'magnifyingglass', title: 'Ничего не найдено', actionLabel: 'Сбросить поиск и фильтр', onAction: fn() } };
