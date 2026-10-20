/** A denied read must evict saved personal data, not fall back to it. */
export class ReadAccessError extends Error {
  constructor(public readonly status: number) { super(`Read denied: ${status}`); }
}
