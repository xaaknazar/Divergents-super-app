// Хранилище истории ИИ-чата. Проверяем именно то, из-за чего переписка
// пропадала: перезапись после неудачного чтения и потеря последних сообщений.
// Имена с префиксом `mock` — единственное, что jest.mock пускает в фабрику.
const mockSaved: Record<string, unknown> = {};
const mockRead: { value: any; ok: boolean } = { value: {}, ok: true };

jest.mock('../persist', () => ({
  readJSON: jest.fn(async () => mockRead),
  saveJSON: jest.fn(async (key: string, val: unknown) => { mockSaved[key] = val; }),
}));

import { loadAiChat, setAiThread, getAiThread, clearAiThread, resetAiChatState, MAX_PERSIST } from '../aiChat';
import { saveJSON } from '../persist';

const KEY = 'ai.history.v1';

beforeEach(() => {
  resetAiChatState();
  for (const k of Object.keys(mockSaved)) delete mockSaved[k];
  (saveJSON as jest.Mock).mockClear();
  mockRead.value = {}; mockRead.ok = true;
});

describe('история ИИ-чата', () => {
  it('поднимает сохранённую переписку', async () => {
    mockRead.value = { general: [{ id: '1', role: 'user', text: 'привет' }] };
    await loadAiChat();
    expect(getAiThread('general')).toHaveLength(1);
    expect(getAiThread('general')[0].text).toBe('привет');
  });

  it('сохраняет сразу после сообщения, без ожидания таймера', async () => {
    await loadAiChat();
    setAiThread('general', [{ id: '1', role: 'user', text: 'вопрос' }]);
    expect(saveJSON).toHaveBeenCalledWith(KEY, { general: [{ id: '1', role: 'user', text: 'вопрос' }] });
  });

  it('НЕ затирает файл, если чтение не удалось', async () => {
    mockRead.ok = false;
    await loadAiChat();
    setAiThread('general', [{ id: '1', role: 'user', text: 'вопрос' }]);
    // В памяти сообщение есть — экран работает.
    expect(getAiThread('general')).toHaveLength(1);
    // Но на диск не пишем: там может лежать история, которую мы не прочитали.
    expect(saveJSON).not.toHaveBeenCalled();
  });

  it('не пишет до окончания загрузки', () => {
    setAiThread('general', [{ id: '1', role: 'user', text: 'рано' }]);
    expect(saveJSON).not.toHaveBeenCalled();
  });

  it('выкидывает пустые пузыри недописанного ответа', async () => {
    mockRead.value = { general: [{ id: '1', role: 'user', text: 'вопрос' }, { id: '2', role: 'bot', text: '' }] };
    await loadAiChat();
    expect(getAiThread('general')).toHaveLength(1);
  });

  it('хранит не больше MAX_PERSIST последних сообщений', async () => {
    await loadAiChat();
    const many = Array.from({ length: MAX_PERSIST + 10 }, (_, i) => ({ id: String(i), role: 'user' as const, text: `m${i}` }));
    setAiThread('general', many);
    const written = (mockSaved[KEY] as any).general;
    expect(written).toHaveLength(MAX_PERSIST);
    expect(written[written.length - 1].text).toBe(`m${MAX_PERSIST + 9}`);
  });

  it('ветки не мешают друг другу', async () => {
    await loadAiChat();
    setAiThread('general', [{ id: '1', role: 'user', text: 'общий' }]);
    setAiThread('books', [{ id: '2', role: 'user', text: 'книги' }]);
    expect(getAiThread('general')[0].text).toBe('общий');
    expect(getAiThread('books')[0].text).toBe('книги');
    clearAiThread('books');
    expect(getAiThread('books')).toHaveLength(0);
    expect(getAiThread('general')).toHaveLength(1);
  });
});
