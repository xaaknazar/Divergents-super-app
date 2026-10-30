import type { Meta, StoryObj } from '@storybook/react-native';
import React, { useState } from 'react';
import { ReadingPagesForm } from './ReadingPagesForm';
function Demo({ initial, fromPage, sessionMinutes, busy, dayLabel, submitLabel }: { initial: string; fromPage?: number; sessionMinutes?: number; busy?: boolean;
  dayLabel?: string; submitLabel?: string }) {
  const [value, setValue] = useState(initial);
  const next = fromPage != null && /^\d+$/.test(value) ? fromPage + Number(value) : undefined;
  return <ReadingPagesForm value={value} onChange={setValue} onSubmit={() => {}} busy={busy} fromPage={fromPage} sessionMinutes={sessionMinutes} nextPage={next}
    dayLabel={dayLabel} submitLabel={submitLabel} />;
}
const meta = { title: 'Reading/Pages form', component: Demo, args: { initial: '15', fromPage: 128, sessionMinutes: 24 } } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Zero: Story = { args: { initial: '0', sessionMinutes: 3 } };
/** Число не введено — сохранить нельзя. */
export const Empty: Story = { args: { initial: '' } };
export const WithoutStartPage: Story = { args: { fromPage: undefined } };
export const Saving: Story = { args: { busy: true } };
export const Dark: Story = { parameters: { scheme: 'dark' } };
export const LargeText: Story = { parameters: { viewport: 'compact', textSize: 'xl' } };
/** День подхода уже закончился: страницы за тот день, затем — таймер на сегодня. */
export const PreviousDay: Story = { args: { initial: '0', sessionMinutes: 60, dayLabel: '24 октября', submitLabel: 'Сохранить и читать сегодня' } };
export const PreviousDayDark: Story = { ...PreviousDay, parameters: { scheme: 'dark' } };
