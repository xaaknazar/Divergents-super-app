import { ACTIVITY_RULES, activityRules, activitySteps, activityTotal, activityNumber } from '../activityConversion';
describe('activity calculator uses published challenge rules', () => {
  test.each(ACTIVITY_RULES)('$label uses its stated conversion', rule => {
    expect(activitySteps({ id: rule.id, value: String(rule.amount) }, 'Женский')).toBe(rule.steps);
  });
  it('adds different exercises to the already counted total exactly once', () => {
    const total = activityTotal('5000', [{ id: 'squats', value: '20' }, { id: 'plank', value: '2' }], 'Мужской');
    expect(total).toBe(5700);
    expect(activityTotal(String(total), [], 'Мужской')).toBe(5700);
    expect(activityTotal(String(total), [{ id: 'pushups', value: '10' }], 'Мужской')).toBe(5900);
  });
  it('uses decimals for distances and minutes but not repetitions; floors only fractional steps', () => {
    expect(activitySteps({ id: 'run', value: '1,25' }, null)).toBe(2500);
    expect(activitySteps({ id: 'cycle', value: '1' }, null)).toBe(666);
    expect(activitySteps({ id: 'pushups', value: '1.5' }, null)).toBeNull();
  });
  it('hides and rejects yoga for missing/male/unrecognized questionnaire values', () => {
    for (const gender of [undefined, null, '', 'Мужской', 'male', 'other']) {
      expect(activityRules(gender).some(rule => rule.id === 'yoga')).toBe(false);
      expect(activityTotal('5000', [{ id: 'yoga', value: '30' }], gender)).toBeNull();
    }
    expect(activitySteps({ id: 'yoga', value: '30' }, 'Женский')).toBe(2000);
  });
  test.each(['-1', '1e4', 'NaN', 'Infinity', '', '12abc', '1.222', '1,2.3', '1000001'])('rejects malformed input %s', value => {
    expect(activityNumber(value)).toBeNull();
  });
  it('rejects an overflowing sum and permits clearing a previous mark to zero', () => {
    expect(activityTotal('999999', [{ id: 'run', value: '1' }], null)).toBeNull();
    expect(activityTotal('0', [], null)).toBe(0);
  });
});
