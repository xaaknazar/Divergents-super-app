import type { Meta, StoryObj } from '@storybook/react-native';
import { EventManagementContent } from './EventManagementContent';
import type { EventManagement } from '../data/eventManagement';
// The production panel loads its own account-scoped API data; these stories show
// the very same presentation component without Clerk or a live organizer account.
const data: EventManagement = {
  canManage: true, canTakeAttendance: true, finished: false, canComplete: true,
  event: { title: 'Пример: вечерний волейбол', description: '', place: 'Спортзал', meetAt: '2026-11-11 17:00', spots: 12, meetLat: null, meetLng: null, updatedAt: '2026-11-11T12:00:00Z' },
  announcements: [],
};
const meta = { title: 'Community/EventManagementPanel', component: EventManagementContent,
  args: { data, onRetry: () => {}, onEdit: () => {}, onAnnounce: () => {}, onAttendance: () => {}, onComplete: () => {} },
} satisfies Meta<typeof EventManagementContent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Started: Story = {};
export const BeforeStart: Story = { args: { data: { ...data, canTakeAttendance: false, canComplete: false } } };
export const Finished: Story = { args: { data: { ...data, finished: true, canComplete: false } } };
export const Participant: Story = { args: { data: { ...data, canManage: false, canTakeAttendance: false, announcements: [{ id: 'demo', text: 'Пример: встречаемся у входа в спортзал.', createdAt: '2026-11-11T12:00:00Z' }] } } };
export const Loading: Story = { args: { data: null, loading: true } };
export const Error: Story = { args: { data: null, error: 'Не удалось загрузить встречу. Проверьте связь.' } };
export const Saving: Story = { args: { busy: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
