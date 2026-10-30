import { useUser } from '@clerk/clerk-expo';
import { useTalentProfile } from './useTalentProfile';

/** Existing source priority, kept outside the visual avatar component. */
export function useProfilePhoto(): string | null {
  const { user } = useUser();
  const { profile } = useTalentProfile();
  return profile?.photoUrl || user?.imageUrl || null;
}
