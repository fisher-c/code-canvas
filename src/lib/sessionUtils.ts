/**
 * Generate a random session ID.
 * 
 * Creates a short, URL-friendly random string.
 * Format: 6 lowercase alphanumeric characters.
 */
export function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
