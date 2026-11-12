/**
 * One line of the local alert log. Pure: no I/O, no clock, no secret.
 * The message is kept exactly as received; only receivedAt and deliveryMs are added.
 */
export type AlertRecord =
  | { receivedAt: string; deliveryMs: number | null; message: unknown }
  | { receivedAt: string; parseError: true; rawLength: number };

export function toRecord(raw: string, receivedAt: Date): AlertRecord {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return { receivedAt: receivedAt.toISOString(), parseError: true, rawLength: raw.length };
  }
  const alertedAt =
    typeof message === "object" && message !== null && "alertedAt" in message
      ? Date.parse(String((message as { alertedAt: unknown }).alertedAt))
      : NaN;
  return {
    receivedAt: receivedAt.toISOString(),
    deliveryMs: Number.isFinite(alertedAt) ? receivedAt.getTime() - alertedAt : null,
    message,
  };
}

/** Close codes after which retrying cannot help: revoked key, ended access, bad key, too many attempts. */
export const FATAL_CLOSE_CODES: ReadonlySet<number> = new Set([4401, 4403, 4429]);

export function nextBackoffMs(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
}
