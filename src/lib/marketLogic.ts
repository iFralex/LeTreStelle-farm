import { addDays, format, isSameDay, parseISO, startOfDay } from 'date-fns'

export interface Market {
  id: string
  name: string
  dayOfWeek: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export const MARKETS: Market[] = [
  { id: 'ariccia', name: 'Mercato di Ariccia', dayOfWeek: 0 },
  { id: 'velletri', name: 'Mercato di Velletri', dayOfWeek: 3 },
]

export interface PickupDate {
  date: Date
  dateStr: string // YYYY-MM-DD
  market: Market
  label: string // human-readable
}

const LEAD_TIME_DAYS = 2
const DATES_TO_FIND = 4

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
  const maxSearch = addDays(today, 120) // safety limit

  while (results.length < DATES_TO_FIND && candidate <= maxSearch) {
    const dow = candidate.getDay()
    const market = MARKETS.find((m) => m.dayOfWeek === dow)

    if (market) {
      const isExcluded = excluded.some((ex) => isSameDay(ex, candidate))
      if (!isExcluded) {
        const dateStr = format(candidate, 'yyyy-MM-dd')
        results.push({
          date: new Date(candidate),
          dateStr,
          market,
          label: `${market.name} — ${format(candidate, 'EEEE d MMMM yyyy')}`,
        })
      }
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
