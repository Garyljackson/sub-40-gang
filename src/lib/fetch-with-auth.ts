/**
 * Fetch wrapper that redirects to login on 401 responses.
 * Use in client components instead of bare fetch() for authenticated API calls.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    window.location.href = '/';
    // Return the response so callers don't throw on the redirect
    return response;
  }

  return response;
}
