import type { Show } from '../../../shared/types/domain'
import { MOVIES } from './movies'
import { CINEMAS, SCREENS } from './venues'

const NOW_SHOWING_IDS = MOVIES.filter((movie) => movie.status === 'now-showing').map((movie) => movie.id)
const DAY_COUNT = 5
const TIME_SLOTS = ['10:30', '15:00', '19:30']
const MOVIES_PER_CINEMA = 5

function pickMoviesForCinema(cinemaIndex: number): string[] {
  const offset = (cinemaIndex * 3) % NOW_SHOWING_IDS.length
  const picked: string[] = []
  for (let i = 0; i < MOVIES_PER_CINEMA; i++) {
    picked.push(NOW_SHOWING_IDS[(offset + i) % NOW_SHOWING_IDS.length])
  }
  return picked
}

function showStartTime(dayIndex: number, time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setDate(date.getDate() + dayIndex)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

function formatForScreen(screenFeatures: string[], genres: string[], dayIndex: number): string {
  if (screenFeatures.includes('IMAX')) return 'IMAX'
  if (screenFeatures.includes('4DX')) return '4DX'
  const isVisualGenre = genres.includes('Animation') || genres.includes('Sci-Fi') || genres.includes('Action')
  return isVisualGenre && dayIndex % 2 === 0 ? '3D' : '2D'
}

export const SHOWS: Show[] = CINEMAS.flatMap((cinema, cinemaIndex) => {
  const screens = SCREENS.filter((screen) => screen.cinemaId === cinema.id)
  const movieIds = pickMoviesForCinema(cinemaIndex)

  return movieIds.flatMap((movieId, movieIndex) => {
    const movie = MOVIES.find((m) => m.id === movieId)!
    const screen = screens[movieIndex % screens.length]
    const language = movie.languages[cinemaIndex % movie.languages.length]

    const shows: Show[] = []
    for (let dayIndex = 0; dayIndex < DAY_COUNT; dayIndex++) {
      for (let slotIndex = 0; slotIndex < TIME_SLOTS.length; slotIndex++) {
        const isPeakSlot = dayIndex === DAY_COUNT - 1 && slotIndex === TIME_SLOTS.length - 1
        const priceOverrides: Record<string, number> = {}
        if (isPeakSlot) {
          for (const tier of screen.layout.tiers) {
            priceOverrides[tier.id] = Math.round((tier.price * 1.1) / 10) * 10
          }
        }

        shows.push({
          id: `${screen.id}__${movieId}__d${dayIndex}__t${slotIndex}`,
          movieId,
          cinemaId: cinema.id,
          screenId: screen.id,
          startTime: showStartTime(dayIndex, TIME_SLOTS[slotIndex]),
          language,
          format: formatForScreen(screen.features, movie.genres, dayIndex),
          priceOverrides,
        })
      }
    }
    return shows
  })
})
