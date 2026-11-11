import { imgUrl } from '../data/api';

/** Use Open Library's cover CDN directly, as the Reading thumbnails do.
 * Keep thumbnail and expanded cover on the same cached URL. */
export function bookCoverSource(url?: string | null, width = 600): string | undefined {
  if (!url) return undefined;
  return url.startsWith('https://covers.openlibrary.org/') ? url : imgUrl(url, width);
}
