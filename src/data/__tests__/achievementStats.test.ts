import { challengeStats } from '../achievementStats';

const noActive = { currentDay: 0, totalDays: 0, myRank: 0 };
const item = (over: any = {}, result: any = {}) => ({
  challengeId: 'c1', title: 'Челлендж', seq: 1, startISO: '2026-09-01', durationDays: 21,
  challengeStatus: 'archived', teamId: 't1', teamName: 'Divergents', status: 'approved',
  joinedAt: '', currentDay: 21, finished: true, announcedAt: null,
  result: {
    points: 100, rank: 5, totalMembers: 150, teamRank: 2, pages: 0, steps: 0, sugarDays: 0,
    judgedDays: 21, flags: {}, eliminated: false, left: false, award: false, canClaimAward: false,
    teamPoints: 0, teamPlace: 1, teamCount: 8, isWinnerTeam: true, ...result,
  },
  ...over,
});

describe('challengeStats', () => {
  it('завершённый челлендж без активного — ачивки остаются', () => {
    expect(challengeStats([item()] as any, noActive)).toEqual({
      challengeDay: 21, challengeFinished: 1, challengeJoined: 1, rankTop3: 1,
    });
  });

  it('выбывший — не финишер, дни до вылета', () => {
    const s = challengeStats([item({}, { eliminated: true, judgedDays: 9, teamRank: 7 })] as any, noActive);
    expect(s).toEqual({ challengeDay: 9, challengeFinished: 0, challengeJoined: 1, rankTop3: 0 });
  });

  it('неодобренная заявка ничего не даёт', () => {
    expect(challengeStats([item({ status: 'pending', result: null })] as any, noActive))
      .toEqual({ challengeDay: 0, challengeFinished: 0, challengeJoined: 0, rankTop3: 0 });
  });

  it('активный челлендж по-прежнему учитывается', () => {
    expect(challengeStats([], { currentDay: 8, totalDays: 21, myRank: 3 }))
      .toEqual({ challengeDay: 8, challengeFinished: 0, challengeJoined: 1, rankTop3: 1 });
  });
});
