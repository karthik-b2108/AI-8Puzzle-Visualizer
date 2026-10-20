import type { Status } from '../../contract/types'

export const STATUS_LABEL: Record<Status, string> = {
  frontier: 'Frontier',
  visited: 'Visited',
  duplicate: 'Duplicate',
  goal: 'Goal',
}

/** CSS token colour for a search-node status. */
export function statusColor(status: Status): string {
  return `var(--status-${status})`
}

/** CSS token colour for the soft background of a search-node status. */
export function statusSoftColor(status: Status): string {
  return `var(--status-${status}-soft)`
}
