import type { Meta,StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { ListRow } from './ListRow';

const meta = {
  title: 'Списки/ListRow', component: ListRow,
  args: { title: 'Продолжить обучение', subtitle: 'Вернуться к последнему уроку', detail: '65%', chevron: true, onPress: fn() },
  argTypes: { detailTone: { control: 'select', options: ['secondary', 'brand', 'danger'] } },
} satisfies Meta<typeof ListRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const ReadOnly: Story = { args: { onPress: undefined, chevron: false } };
export const Action: Story = { args: { detailTone: 'brand' } };
export const Warning: Story = { args: { detailTone: 'danger', detail: 'Ошибка' } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
