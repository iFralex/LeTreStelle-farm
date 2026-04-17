import { addDays, format, isSameDay, parseISO, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'

export interface Market {
  id: string
  name: string
  daysOfWeek: number[] // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export const MARKETS: Market[] = [
  { id: 'ariccia', name: 'Mercato di Ariccia', daysOfWeek: [0] },
  { id: 'velletri', name: 'Mercato di Velletri', daysOfWeek: [2,3,4,5,6,7] },
]

export interface PickupDate {
  date: Date
  dateStr: string // YYYY-MM-DD
  market: Market
  label: string // human-readable
}

const LEAD_TIME_DAYS = 2
const DATES_TO_FIND = 4

function makePickupDate(candidate: Date, market: Market): PickupDate {
  const dateStr = format(candidate, 'yyyy-MM-dd')
  return {
    date: new Date(candidate),
    dateStr,
    market,
    label: `${market.name} — ${format(candidate, 'EEEE d MMMM yyyy', { locale: it })}`,
  }
}

function isExcluded(candidate: Date, excluded: Date[]): boolean {
  return excluded.some((ex) => isSameDay(ex, candidate))
}

/**
 * Returns the next available pickup dates across all markets,
 * respecting a 2-day lead time and filtering out excluded dates.
 */
export function getAvailablePickupDates(excludedDates: string[]): PickupDate[] {
  const today = startOfDay(new Date())
  const earliest = addDays(today, LEAD_TIME_DAYS)
  const excluded = excludedDates.map((d) => parseISO(d))
  const results: PickupDate[] = []

  let candidate = new Date(earliest)
  const maxSearch = addDays(today, 120)

  while (results.length < DATES_TO_FIND && candidate <= maxSearch) {
    const dow = candidate.getDay()
    const market = MARKETS.find((m) => m.daysOfWeek.includes(dow))

    if (market && !isExcluded(candidate, excluded)) {
      results.push(makePickupDate(candidate, market))
    }

    candidate = addDays(candidate, 1)
  }

  return results
}

/**
 * Returns the next N available pickup dates for a specific market,
 * looking further ahead than the main picker.
 */
export function getPickupDatesForMarket(
  marketId: string,
  excludedDates: string[],
  count = 12
): PickupDate[] {
  const market = MARKETS.find((m) => m.id === marketId)
  if (!market) return []

  const today = startOfDay(new Date())
  const earliest = addDays(today, LEAD_TIME_DAYS)
  const excluded = excludedDates.map((d) => parseISO(d))
  const results: PickupDate[] = []

  let candidate = new Date(earliest)
  const maxSearch = addDays(today, 365)

  while (results.length < count && candidate <= maxSearch) {
    const dow = candidate.getDay()
    if (market.daysOfWeek.includes(dow) && !isExcluded(candidate, excluded)) {
      results.push(makePickupDate(candidate, market))
    }
    candidate = addDays(candidate, 1)
  }

  return results
}

export const PRE_ORDER_DISCOUNT = 0.1 // 10%

/**
 * Returns the discounted price and formatted discount label.
 */
export function applyPreOrderDiscount(price: number): {
  discountedPrice: number
  discountLabel: string
  originalPrice: number
} {
  return {
    originalPrice: price,
    discountedPrice: price * (1 - PRE_ORDER_DISCOUNT),
    discountLabel: `-${Math.round(PRE_ORDER_DISCOUNT * 100)}%`,
  }
}

/**
 * Formats a price in euros (e.g. "€ 1,50 / kg").
 */
export function formatPrice(price: number, measureUnit: string): string {
  return `€ ${price.toFixed(2).replace('.', ',')} / ${measureUnit}`
}
