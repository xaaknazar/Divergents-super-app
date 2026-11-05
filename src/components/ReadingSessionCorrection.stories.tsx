import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ReadingSessionCorrection } from './ReadingSessionCorrection';
export const correctionFixture = { id: 'approach', book: 'Brainstorm: The Power and Purpose of the Teenage Brain', author: 'Daniel J. Siegel',
  date: '2026-11-05', day: 16, startedAt: '2026-11-05T17:52:00Z', editableUntil: Date.parse('2026-11-06T19:00:00Z'), pages: 415, elapsedMs: 58 * 60000 };
function Demo({ busy = false }: { busy?: boolean }) {
  const [session, setSession] = useState(correctionFixture);
  return <ReadingSessionCorrection session={session} busy={busy} onSave={async (_, pages) => { setSession(s => ({ ...s, pages })); }} />;
}
const meta = { title: 'Reading/Correct saved pages', component: Demo, args: { busy: false } } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = {};
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { textSize: 'xl', viewport: 'compact' } };
export const Busy: Story = { args: { busy: true } };
