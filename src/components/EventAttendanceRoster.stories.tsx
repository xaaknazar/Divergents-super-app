import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { EventAttendanceRoster } from './EventAttendanceRoster';
import { AttendanceParticipant } from '../data/eventAttendance';
import { Screen } from './Screen';
import { NavHeader } from './NavHeader';
export const attendanceExamples: AttendanceParticipant[] = [
  { applicationId: 'demo-1', userId: 'demo-1', name: 'Айдана', record: { id: 'r1', applicationId: 'demo-1', userId: 'demo-1', status: 'arrived', comment: '', version: 1, updatedAt: '2026-11-11T12:00:00Z' } },
  { applicationId: 'demo-2', userId: 'demo-2', name: 'Арман', record: { id: 'r2', applicationId: 'demo-2', userId: 'demo-2', status: 'late', comment: 'Пришёл на 10 минут позже', version: 1, updatedAt: '2026-11-11T12:00:00Z' } },
  { applicationId: 'demo-3', userId: 'demo-3', name: 'Алия', record: null },
];
function Preview(args: React.ComponentProps<typeof EventAttendanceRoster>) {
  const [participants, setParticipants] = useState(args.participants);
  return <Screen scroll={false} topInset={false} tabPadding={false}><NavHeader title="Посещение" subtitle="Вечерний волейбол" largeTitle onBack={() => {}} />
    <EventAttendanceRoster {...args} participants={participants} onSave={async (id, status, comment) => {
      await args.onSave(id, status, comment);
      setParticipants(prev => prev.map(p => p.applicationId === id ? { ...p, record: { id, applicationId: id, userId: p.userId, status, comment, version: (p.record?.version ?? 0) + 1, updatedAt: new Date().toISOString() } } : p));
    }} />
  </Screen>;
}
const meta = { title: 'Community/EventAttendanceRoster', component: EventAttendanceRoster, render: args => <Preview {...args} />,
  parameters: { canvasLayout: 'screen' }, args: { participants: attendanceExamples, onRefresh: () => {}, onSave: async (): Promise<void> => {} },
} satisfies Meta<typeof EventAttendanceRoster>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl' } };
export const Empty: Story = { args: { participants: [] } };
export const Loading: Story = { args: { participants: [], loading: true } };
export const Error: Story = { args: { error: 'Не удалось загрузить участников. Проверьте интернет.' } };
export const Saving: Story = { args: { onSave: async () => new Promise<void>(() => {}) } };
export const SaveFailed: Story = { args: { onSave: async () => { throw new globalThis.Error('Нет подтверждения сервера. Обновите список и проверьте отметку.'); } } };
