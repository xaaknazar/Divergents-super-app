import { normalizeTabTarget } from '../ref';

describe('цель уведомления', () => {
  it('вкладка без экрана — валидная цель', () => {
    expect(normalizeTabTarget('CommunityTab')).toEqual({ screen: 'CommunityTab' });
  });

  it('экран с нужным идентификатором открывается поверх домашнего', () => {
    expect(normalizeTabTarget('CommunityTab', 'ChallengeDetail', { challengeId: 'ch1' })).toEqual({
      screen: 'CommunityTab',
      params: { screen: 'ChallengeDetail', params: { challengeId: 'ch1' }, initial: false },
    });
  });

  it('без идентификатора открывается вкладка, а не пустой экран', () => {
    // Уведомление, созданное в админке без параметров: экран разбирал бы
    // route.params и падал — человек видел «Что-то пошло не так».
    expect(normalizeTabTarget('CommunityTab', 'ChallengeDetail')).toEqual({ screen: 'CommunityTab' });
    expect(normalizeTabTarget('CommunityTab', 'ChallengeDetail', {})).toEqual({ screen: 'CommunityTab' });
    expect(normalizeTabTarget('CommunityTab', 'ChallengeDetail', { challengeId: '' })).toEqual({ screen: 'CommunityTab' });
    expect(normalizeTabTarget('CommunityTab', 'ChallengeApplicants', { foo: 1 })).toEqual({ screen: 'CommunityTab' });
  });

  it('экранам без обязательных параметров ничего не мешает', () => {
    expect(normalizeTabTarget('ProfileTab', 'Achievements')).toEqual({
      screen: 'ProfileTab',
      params: { screen: 'Achievements', params: undefined, initial: false },
    });
  });

  it('поездка, канал, курс и книга проверяются так же', () => {
    expect(normalizeTabTarget('CommunityTab', 'TripDetail')).toEqual({ screen: 'CommunityTab' });
    expect(normalizeTabTarget('CommunityTab', 'ServerChannel', { channelId: 'c1' }).params).toBeTruthy();
    expect(normalizeTabTarget('LMSTab', 'CourseDetail')).toEqual({ screen: 'LMSTab' });
    expect(normalizeTabTarget('LMSTab', 'BookDetail', { bookId: 'b1' }).params).toBeTruthy();
  });
});
