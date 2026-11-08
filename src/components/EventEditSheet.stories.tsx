import type { Meta, StoryObj } from '@storybook/react-native';
import { EventEditSheet } from './EventEditSheet';
const meta = { title: 'Community/EventEditSheet', component: EventEditSheet, args: { initial: { title: 'Пример: Кофе и общение', description: 'Неформальная встреча в центре города.', place: 'Астана, кофейня', meetAt: '2026-12-01 17:00', spots: 5, meetLat: 51.1, meetLng: 71.4, updatedAt: '2026-11-08T00:00:00Z' }, onClose: () => {}, onSave: async () => {} } } satisfies Meta<typeof EventEditSheet>;
export default meta; type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
export const SaveError: Story = { args: { onSave: async () => { throw new Error('Событие уже изменилось. Закройте форму и откройте её снова.'); } } };
