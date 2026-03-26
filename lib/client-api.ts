export function createAuthorizedHeaders(
  accessToken: string | null,
  headers?: HeadersInit
) {
  const nextHeaders = new Headers(headers)

  if (accessToken) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`)
  }

  return nextHeaders
}
