import type { Meta, StoryObj } from '@storybook/react-native';
import { EventAttendanceRow } from './EventAttendanceRow';
import { attendanceExamples } from './EventAttendanceRoster.stories';
const meta = { title: 'Community/EventAttendanceRow', component: EventAttendanceRow,
 args: { participant: attendanceExamples[2], onRefresh: () => {}, onSave: async (): Promise<void> => {} },
} satisfies Meta<typeof EventAttendanceRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Unmarked: Story = {};
export const Arrived: Story = { args: { participant: attendanceExamples[0] } };
export const Late: Story = { args: { participant: attendanceExamples[1] } };
export const Absent: Story = { args: { participant: { ...attendanceExamples[0], record: { ...attendanceExamples[0].record!, status: 'absent' } } } };
export const Dark: Story = { ...Late, parameters: { scheme: 'dark' } };
export const LargeText: Story = { ...Late, parameters: { textSize: 'xl' } };
