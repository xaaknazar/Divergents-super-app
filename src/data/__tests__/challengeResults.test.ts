import { resultTeamMembers } from '../challengeResults';
import { finalResultsFixture } from '../../storybook/challengeResultsFixtures';

it('uses only the selected historical team and numbers its members from one', () => {
  const data = { ...finalResultsFixture, overall: [...finalResultsFixture.overall].reverse() };
  const original = [...data.overall];
  expect(resultTeamMembers(data).map(({ member, teamRank }) => [member.id, teamRank, member.rank, member.points]))
    .toEqual([['me', 1, 2, 776], ['left', 2, 4, 48], ['eliminated', 3, 5, 0]]);
  expect(data.overall).toEqual(original);
});
it('retains server tie-breaking and includes zero-score / departed members', () => {
  const data = { ...finalResultsFixture, overall: finalResultsFixture.overall.map(member => ({ ...member, points: 0 })) };
  expect(resultTeamMembers(data).map(({ member }) => member.id)).toEqual(['me', 'left', 'eliminated']);
});
it('does not treat all unassigned participants as one team', () => {
  expect(resultTeamMembers({ ...finalResultsFixture, team: null })).toEqual([]);
  expect(resultTeamMembers({ ...finalResultsFixture, overall: [] })).toEqual([]);
});
