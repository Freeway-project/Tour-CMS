/**
 * Constant-time comparison for the private booking token.
 *
 * The confirmation page is reachable with a booking reference (short and
 * guessable), so it also needs the token. Comparing with `===` would leak how
 * many characters matched through timing; this loop always inspects the whole
 * token.
 *
 * The length check is not secret: every token is 48 hex characters.
 */
export function tokensMatch(
  expected: string | null | undefined,
  provided: string | null | undefined,
): boolean {
  if (!expected || !provided) return false;
  if (expected.length !== provided.length) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }

  return difference === 0;
}
