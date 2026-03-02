const VOTER_ID_KEY = 'corpdev_voter_id';

/**
 * Get or create a persistent anonymous voter UUID.
 * Stored in localStorage so the same browser always has the same identity.
 */
export function getOrCreateVoterId(): string {
  const existing = localStorage.getItem(VOTER_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem(VOTER_ID_KEY, id);
  return id;
}
