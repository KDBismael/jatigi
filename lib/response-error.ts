/** Error carrying the API's French message, or the fallback when the body has none. */
export async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null)
  return new Error(typeof body?.error === 'string' && body.error.trim() ? body.error : fallback)
}
