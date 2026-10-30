import type { ChallengeResults } from './community';

/** Keep server ranking (including its tie-breaks), never recalculate points on the phone. */
export function resultTeamMembers(data: ChallengeResults) {
  if (!data.team) return [];
  return data.overall.filter(member => member.teamId === data.team!.id)
    .sort((a, b) => a.rank - b.rank)
    .map((member, index) => ({ member, teamRank: index + 1 }));
}
