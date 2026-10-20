import { API_BASE } from '../config';
import { checkNicknameAvailable, getTalentslabToken } from './talentslab';

type GetToken = (opts?: { template?: string }) => Promise<string | null>;

/** Both stores enforce uniqueness. Never label an unavailable check as free. */
export async function checkPublicNickname(getToken: GetToken, nickname: string): Promise<boolean | null> {
  const siteCheck = async (): Promise<boolean | null> => {
    const token = await getToken();
    if (!token) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(`${API_BASE}/api/mobile/me/nickname?nickname=${encodeURIComponent(nickname.trim())}`, {
        signal: ctrl.signal,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data?.available === 'boolean' ? data.available : null;
    } finally { clearTimeout(timer); }
  };
  const talentCheck = async () => checkNicknameAvailable(await getTalentslabToken(getToken), nickname.trim());
  const [site, talent] = await Promise.all([siteCheck().catch(() => null), talentCheck().catch(() => null)]);
  if (site === false || talent === false) return false;
  return site === true && talent === true ? true : null;
}
