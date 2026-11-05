import React, { useState } from 'react';
import { render as nativeRender, fireEvent, waitFor } from '@testing-library/react-native';
import { ReadingPagesForm } from '../ReadingPagesForm';
import { ReadingSessionCorrection } from '../ReadingSessionCorrection';
import { parseReadingPages, unusualReadingPages } from '../../data/readingPageEntry';
import { correctionFixture } from '../ReadingSessionCorrection.stories';
import { ThemePreviewProvider } from '../ThemePreviewProvider';
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
const render = (ui: React.ReactElement) => nativeRender(ui, { wrapper: ThemePreviewProvider });

test('page parser never silently turns a decimal or pasted page number into another count', () => {
  for (const value of ['', '12,5', '12.5', '-1', '1e3', '10001', '100000', '50 стр.']) expect(parseReadingPages(value)).toBeNull();
  expect(parseReadingPages('0')).toBe(0); expect(parseReadingPages('50')).toBe(50);
  expect(unusualReadingPages(415,58)).toBe(true); expect(unusualReadingPages(50,58)).toBe(false);
});
test('415 pages require a deliberate confirmation; edit returns to the same count', async () => {
  const submit = jest.fn();
  function Demo() { const [value,setValue]=useState('415'); return <ReadingPagesForm value={value} onChange={setValue} onSubmit={submit} sessionMinutes={58} />; }
  const v=await render(<Demo />);
  await fireEvent.press(v.getByRole('button',{name:'Сохранить подход'}));
  expect(submit).not.toHaveBeenCalled();
  expect(v.getByText('415 страниц за 58 мин — всё верно?')).toBeTruthy();
  await fireEvent.press(v.getByRole('button',{name:'Исправить число'}));
  expect(v.getByLabelText('Страниц за этот подход').props.value).toBe('415');
  await fireEvent.changeText(v.getByLabelText('Страниц за этот подход'),'50');
  await fireEvent.press(v.getByRole('button',{name:'Сохранить подход'}));
  expect(submit).toHaveBeenCalledTimes(1);
});
test('unusual count can be confirmed and changing props invalidates the old confirmation', async () => {
  const submit=jest.fn();
  const v=await render(<ReadingPagesForm value="415" onChange={()=>{}} onSubmit={submit} sessionMinutes={58} />);
  await fireEvent.press(v.getByRole('button',{name:'Сохранить подход'}));
  await fireEvent.press(v.getByRole('button',{name:'Да, сохранить 415 страниц'}));
  expect(submit).toHaveBeenCalledTimes(1);
  await v.rerender(<ReadingPagesForm value="416" onChange={()=>{}} onSubmit={submit} sessionMinutes={58} />);
  expect(v.queryByText('Да, сохранить 415 страниц')).toBeNull();
  await fireEvent.press(v.getByRole('button',{name:'Сохранить подход'}));
  expect(submit).toHaveBeenCalledTimes(1);
});
test('failed correction keeps the draft visible and only closes after acknowledgement', async () => {
  const save=jest.fn().mockRejectedValueOnce(new Error('Нет подтверждения сервера')).mockResolvedValueOnce(undefined);
  const v=await render(<ReadingSessionCorrection session={correctionFixture} busy={false} onSave={save} />);
  await fireEvent.press(v.getByRole('button',{name:'Изменить страницы'}));
  await fireEvent.changeText(v.getByLabelText('Страниц за этот подход'),'50');
  await fireEvent.press(v.getByRole('button',{name:'Сохранить изменения'}));
  await waitFor(()=>expect(v.getByText('Нет подтверждения сервера')).toBeTruthy());
  expect(v.getByLabelText('Страниц за этот подход').props.value).toBe('50');
  await fireEvent.press(v.getByRole('button',{name:'Сохранить изменения'}));
  await waitFor(()=>expect(v.getByText('Изменения сохранены')).toBeTruthy());
  expect(save).toHaveBeenLastCalledWith(correctionFixture,50);
});
