import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { EventMessageSheet } from '../EventMessageSheet';
import { EventEditSheet } from '../EventEditSheet';
import { EventAttendanceReport } from '../EventAttendanceReport';
jest.mock('../HalfSheet', () => ({ HalfSheet: ({ children, footer }: any) => <>{children}{footer}</> }));
jest.mock('../SFIcon', () => ({ SF: () => null }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn().mockReturnValueOnce('operation-1').mockReturnValue('operation-2') }));
jest.mock('../../lib/haptics', () => ({ hTap: jest.fn(), hSelect: jest.fn() }));
jest.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ ...jest.requireActual('../../theme/tokens'), reduceMotion: true }) }));

it('requires an explanation, preserves draft on failure and reuses operation id for retry', async () => {
 const save=jest.fn().mockRejectedValueOnce(new Error('Нет связи')).mockResolvedValue(undefined);const close=jest.fn();
 const v=await render(<EventMessageSheet mode="flag" onClose={close} onSave={save} />);
 await fireEvent.press(v.getByRole('button',{name:'Сохранить отметку'}));expect(save).not.toHaveBeenCalled();
 await fireEvent.press(v.getByRole('button',{name:'Нарушение правил'}));
 await fireEvent.changeText(v.getByLabelText('Что произошло'),' Пояснение организатора ');
 await fireEvent.press(v.getByRole('button',{name:'Сохранить отметку'}));
 await waitFor(()=>expect(v.getByText('Нет связи')).toBeTruthy());expect(close).not.toHaveBeenCalled();
 await fireEvent.press(v.getByRole('button',{name:'Сохранить отметку'}));
 await waitFor(()=>expect(close).toHaveBeenCalledTimes(1));
 expect(save.mock.calls[0][0]).toEqual(save.mock.calls[1][0]);expect(save.mock.calls[0][0]).toMatchObject({action:'flag',reason:'misconduct',note:'Пояснение организатора'});
});
it('pending save prevents duplicate action and closes only after confirmation', async () => {
 let done!:()=>void;const save=jest.fn(()=>new Promise<void>(r=>{done=r;}));const close=jest.fn();
 const v=await render(<EventMessageSheet mode="announcement" onClose={close} onSave={save} />);
 await fireEvent.changeText(v.getByLabelText('Текст сообщения'),'Ждём у входа');
 await fireEvent.press(v.getByRole('button',{name:'Опубликовать и уведомить'}));await fireEvent.press(v.getByRole('button',{name:'Опубликовать и уведомить'}));
 expect(save).toHaveBeenCalledTimes(1);expect(close).not.toHaveBeenCalled();done();await waitFor(()=>expect(close).toHaveBeenCalledTimes(1));
});
it('edit sends version and coordinates, rejects incomplete coordinate pairs and keeps errors',async()=>{
 const save=jest.fn().mockResolvedValue(undefined);
 const v=await render(<EventEditSheet initial={{title:'Coffee',description:'Description',place:'Astana',meetAt:'2026-12-01 17:00',spots:5,meetLat:51.1,meetLng:71.4,updatedAt:'version'}} onSave={save} onClose={()=>{}} />);
 await fireEvent.changeText(v.getByLabelText('Долгота точки встречи'),'');await fireEvent.press(v.getByRole('button',{name:'Сохранить и уведомить'}));expect(save).not.toHaveBeenCalled();
 await fireEvent.changeText(v.getByLabelText('Долгота точки встречи'),'71.5');await fireEvent.press(v.getByRole('button',{name:'Сохранить и уведомить'}));
 expect(save).toHaveBeenCalledWith(expect.objectContaining({action:'edit',updatedAt:'version',meetLng:71.5}));
});
it('own profile shows attributed reason without management actions; network error is not a clean record',async()=>{
 const flag={id:'f',kind:'meetup' as const,eventId:'e',eventTitle:'Встреча',eventDate:null,reason:'no_show' as const,note:'Не пришёл к месту встречи',createdAt:'2026-11-08T00:00:00Z'};
 const v=await render(<EventAttendanceReport flags={[flag]} own onRetry={()=>{}} />);
 expect(v.getByText('Не пришёл')).toBeTruthy();expect(v.getByText(flag.note)).toBeTruthy();expect(v.queryByText('Добавить отметку этой встречи')).toBeNull();
 await v.rerender(<EventAttendanceReport flags={[]} error="Нет связи" onRetry={()=>{}} />);
 expect(v.queryByText('Отметок о пропусках и нарушениях нет')).toBeNull();expect(v.getByRole('button',{name:'Повторить'})).toBeTruthy();
});
