const mockRead = jest.fn(), mockSave = jest.fn();
jest.mock('../persist', () => ({ readJSON: (...args: unknown[]) => mockRead(...args), saveJSON: (...args: unknown[]) => mockSave(...args) }));
beforeEach(() => { jest.resetModules(); mockRead.mockReset(); mockSave.mockReset().mockResolvedValue(undefined); });
test('partial selection preserves the stored other field', async () => {
  mockRead.mockResolvedValue({ ok: true, value: { card: 'compact', header: 'cover' } });
  const { setReadingAppearance } = require('../useReadingAppearance');
  await setReadingAppearance({ header: 'focus' });
  expect(mockSave).toHaveBeenLastCalledWith('dvg.readingAppearance.v1', { card: 'compact', header: 'focus' }, { strict: true });
});
test('failed hydration never overwrites an unread preference, and a retry can recover', async () => {
  mockRead.mockResolvedValueOnce({ ok: false, value: {} }).mockResolvedValueOnce({ ok: true, value: { card: 'compact', header: 'glass' } });
  const { setReadingAppearance } = require('../useReadingAppearance');
  await expect(setReadingAppearance({ header: 'cover' })).rejects.toThrow();
  expect(mockSave).not.toHaveBeenCalled();
  await setReadingAppearance({ header: 'cover' });
  expect(mockSave).toHaveBeenCalledWith('dvg.readingAppearance.v1', { card: 'compact', header: 'cover' }, { strict: true });
});
test('storage failure is reported rather than claiming the choice is saved', async () => {
  mockRead.mockResolvedValue({ ok: true, value: {} }); mockSave.mockRejectedValueOnce(new Error('disk'));
  const { setReadingAppearance } = require('../useReadingAppearance');
  await expect(setReadingAppearance({ card: 'compact' })).rejects.toThrow('disk');
  await setReadingAppearance({ card: 'compact' });
  expect(mockSave).toHaveBeenLastCalledWith('dvg.readingAppearance.v1', { card: 'compact', header: 'editorial' }, { strict: true });
});
