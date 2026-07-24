import type { Cinema, City, Screen, ScreenLayout, SeatTier } from '../../../shared/types/domain'

export const CITIES: City[] = [
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra' },
  { id: 'delhi', name: 'Delhi NCR', state: 'Delhi' },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka' },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana' },
]

interface TierSpec {
  id: string
  name: string
  price: number
  color: string
  rows: number
}

function buildLayout(cols: number, tierSpecs: TierSpec[], aisleAfterCols: number[]): ScreenLayout {
  let cursor = 0
  const tiers: SeatTier[] = tierSpecs.map((spec) => {
    const rowStart = cursor
    const rowEnd = cursor + spec.rows - 1
    cursor += spec.rows
    return {
      id: spec.id,
      name: spec.name,
      price: spec.price,
      color: spec.color,
      rowStart,
      rowEnd,
    }
  })
  return {
    rows: cursor,
    cols,
    aisleAfterCols,
    aisleAfterRows: [],
    tiers,
    skipSeats: [],
  }
}

const TIER_COLOR = {
  classic: '#3ddbb0',
  premium: '#ffcb47',
  recliner: '#ff7a52',
}

const LAYOUT_TEMPLATES: Record<string, () => ScreenLayout> = {
  boutique: () =>
    buildLayout(
      10,
      [
        { id: 'classic', name: 'Classic', price: 180, color: TIER_COLOR.classic, rows: 5 },
        { id: 'premium', name: 'Premium', price: 280, color: TIER_COLOR.premium, rows: 2 },
        { id: 'recliner', name: 'Recliner', price: 450, color: TIER_COLOR.recliner, rows: 1 },
      ],
      [2, 7],
    ),
  standard: () =>
    buildLayout(
      14,
      [
        { id: 'classic', name: 'Classic', price: 200, color: TIER_COLOR.classic, rows: 6 },
        { id: 'premium', name: 'Premium', price: 320, color: TIER_COLOR.premium, rows: 3 },
        { id: 'recliner', name: 'Recliner', price: 500, color: TIER_COLOR.recliner, rows: 1 },
      ],
      [3, 10],
    ),
  grand: () =>
    buildLayout(
      16,
      [
        { id: 'classic', name: 'Classic', price: 190, color: TIER_COLOR.classic, rows: 7 },
        { id: 'premium', name: 'Premium', price: 300, color: TIER_COLOR.premium, rows: 4 },
        { id: 'recliner', name: 'Recliner', price: 480, color: TIER_COLOR.recliner, rows: 1 },
      ],
      [3, 12],
    ),
  lounge: () =>
    buildLayout(
      10,
      [
        { id: 'premium', name: 'Premium', price: 350, color: TIER_COLOR.premium, rows: 5 },
        { id: 'recliner', name: 'Recliner', price: 600, color: TIER_COLOR.recliner, rows: 3 },
      ],
      [2, 7],
    ),
}

interface ScreenSpec {
  name: string
  template: keyof typeof LAYOUT_TEMPLATES
  features: string[]
}

const SCREEN_SPEC_SETS: ScreenSpec[][] = [
  [
    { name: 'Screen 1', template: 'boutique', features: ['Dolby Audio'] },
    { name: 'Screen 2', template: 'standard', features: ['Dolby Atmos'] },
    { name: 'IMAX Screen', template: 'grand', features: ['IMAX', 'Dolby Atmos'] },
  ],
  [
    { name: 'Screen 1', template: 'standard', features: ['Dolby Atmos'] },
    { name: 'Screen 2', template: 'grand', features: ['Dolby Atmos'] },
  ],
  [
    { name: 'Screen 1', template: 'boutique', features: ['Dolby Audio'] },
    { name: 'Screen 2', template: 'standard', features: ['Dolby Atmos'] },
    { name: 'Screen 3', template: 'grand', features: ['4DX'] },
    { name: 'Gold Lounge', template: 'lounge', features: ['Recliner Seating', 'Butler Service'] },
  ],
]

interface CinemaSpec {
  id: string
  cityId: string
  chain: string
  location: string
  address: string
  screenSetIndex: number
}

const CINEMA_SPECS: CinemaSpec[] = [
  { id: 'aurora-kurla', cityId: 'mumbai', chain: 'Aurora Cineplex', location: 'Phoenix Marketcity, Kurla', address: 'LBS Marg, Kurla West, Mumbai', screenSetIndex: 2 },
  { id: 'northstar-malad', cityId: 'mumbai', chain: 'Northstar Multiplex', location: 'Infiniti Mall, Malad', address: 'New Link Road, Malad West, Mumbai', screenSetIndex: 1 },
  { id: 'vertex-ghatkopar', cityId: 'mumbai', chain: 'Vertex Screens', location: 'R City Mall, Ghatkopar', address: 'LBS Marg, Ghatkopar West, Mumbai', screenSetIndex: 0 },
  { id: 'aurora-saket', cityId: 'delhi', chain: 'Aurora Cineplex', location: 'Select Citywalk, Saket', address: 'District Centre, Saket, New Delhi', screenSetIndex: 2 },
  { id: 'cascade-noida', cityId: 'delhi', chain: 'Cascade Cinemas', location: 'DLF Mall of India, Noida', address: 'Sector 18, Noida, Delhi NCR', screenSetIndex: 0 },
  { id: 'northstar-tagore', cityId: 'delhi', chain: 'Northstar Multiplex', location: 'Pacific Mall, Tagore Garden', address: 'Tagore Garden, New Delhi', screenSetIndex: 1 },
  { id: 'vertex-rajajinagar', cityId: 'bengaluru', chain: 'Vertex Screens', location: 'Orion Mall, Rajajinagar', address: 'Brigade Gateway, Rajajinagar, Bengaluru', screenSetIndex: 2 },
  { id: 'cascade-koramangala', cityId: 'bengaluru', chain: 'Cascade Cinemas', location: 'Forum Mall, Koramangala', address: '100 Feet Road, Koramangala, Bengaluru', screenSetIndex: 0 },
  { id: 'aurora-banjara', cityId: 'hyderabad', chain: 'Aurora Cineplex', location: 'GVK One, Banjara Hills', address: 'Road No. 1, Banjara Hills, Hyderabad', screenSetIndex: 1 },
  { id: 'northstar-cyberabad', cityId: 'hyderabad', chain: 'Northstar Multiplex', location: 'Inorbit Mall, Cyberabad', address: 'Mindspace, Cyberabad, Hyderabad', screenSetIndex: 2 },
]

export const SCREENS: Screen[] = CINEMA_SPECS.flatMap((spec) =>
  SCREEN_SPEC_SETS[spec.screenSetIndex].map((screenSpec, index) => ({
    id: `${spec.id}-scr${index + 1}`,
    cinemaId: spec.id,
    name: screenSpec.name,
    layout: LAYOUT_TEMPLATES[screenSpec.template](),
    features: screenSpec.features,
  })),
)

export const CINEMAS: Cinema[] = CINEMA_SPECS.map((spec) => ({
  id: spec.id,
  cityId: spec.cityId,
  name: `${spec.chain} — ${spec.location}`,
  address: spec.address,
  screenIds: SCREENS.filter((screen) => screen.cinemaId === spec.id).map((screen) => screen.id),
}))
