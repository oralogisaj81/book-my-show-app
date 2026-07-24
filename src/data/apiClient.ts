import type { BookingApi } from './api'
import { httpApi } from './httpApi'

/** The single import site for the whole app — swap the implementation here, not at every call site. */
export const api: BookingApi = httpApi
