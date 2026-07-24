import type { Cinema, Screen } from '../../shared/types/domain'

type CinemaRow = Omit<Cinema, 'screenIds'>

/** Cinema.screenIds is derived (screens.cinema_id), not stored — computed here for the wire format. */
export function attachScreenIds(cinemaRows: CinemaRow[], allScreens: Pick<Screen, 'id' | 'cinemaId'>[]): Cinema[] {
  return cinemaRows.map((cinema) => ({
    ...cinema,
    screenIds: allScreens.filter((s) => s.cinemaId === cinema.id).map((s) => s.id),
  }))
}
