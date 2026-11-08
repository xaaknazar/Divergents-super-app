import type { Meta, StoryObj } from '@storybook/react-native';
import { EventAttendanceReport } from './EventAttendanceReport';
const meta = { title: 'Community/EventAttendanceReport', component: EventAttendanceReport,
 args: { flags: [], onRetry: () => {} },
} satisfies Meta<typeof EventAttendanceReport>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Error: Story = { args: { error: 'Не удалось загрузить отметки о встречах. Проверьте связь и повторите попытку.' } };
export const Organizer: Story = { args: { flags: [{ id:'sample', kind:'meetup', eventId:'sample', eventTitle:'Пример: Кофе и общение', eventDate:'2026-11-08 17:00', reason:'no_show', note:'Пример: участник не пришёл и не предупредил организатора.', createdAt:'2026-11-09T08:00:00Z' }], onMark: () => {}, onRevoke: () => {} } };
export const Own: Story = { args: { ...Organizer.args, own: true, onMark: undefined, onRevoke: undefined } };
export const Dark: Story = { ...Organizer, parameters: { scheme: 'dark' } };
export const LargeText: Story = { ...Organizer, parameters: { viewport: 'compact', textSize: 'xl' } };

export const Misconduct: Story = { args: { ...Organizer.args, flags: [{ ...Organizer.args!.flags![0], reason: 'misconduct', note: 'Пример: пояснение организатора о нарушении правил встречи.' }] } };
