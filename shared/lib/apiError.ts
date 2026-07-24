/** Shared between frontend and backend so a server error and a thrown client-side error look identical to callers. */
export class ApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiError'
  }
}
