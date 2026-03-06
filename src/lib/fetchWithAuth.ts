/**
 * A fetch wrapper that handles 401 Unauthorized responses by redirecting
 * the user to the login page. Use this in Redux thunks instead of raw fetch.
 */
export async function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, options)

  if (response.status === 401) {
    // Session expired or invalid — redirect to login
    const redirectTo = typeof window !== 'undefined' ? window.location.pathname : '/'
    window.location.href = `/login?redirect=${encodeURIComponent(redirectTo)}&error=session_expired`
    // Throw so the thunk rejects instead of trying to parse the 401 body
    throw new Error('Session expired. Please log in again.')
  }

  return response
}
