export interface AllowlistedName {
  firstName: string
  lastName: string
}

/**
 * Hardcoded first+last name pairs that auto-activate organizer mode at
 * Tysons Corner check-in (issue #6). Placeholder entries — the presenter
 * will swap these for the real names before the event.
 */
const ADMIN_ALLOWLIST: AllowlistedName[] = [
  { firstName: 'Jordan', lastName: 'Blake' },
  { firstName: 'Taylor', lastName: 'Nguyen' },
]

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

/** Case-insensitive, exact first+last name match against the admin allowlist. */
export function isAllowlistedAdmin(firstName: string, lastName: string): boolean {
  const first = normalize(firstName)
  const last = normalize(lastName)
  return ADMIN_ALLOWLIST.some(
    (entry) => normalize(entry.firstName) === first && normalize(entry.lastName) === last,
  )
}
