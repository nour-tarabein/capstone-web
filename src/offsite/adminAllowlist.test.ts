import { describe, expect, it } from 'vitest'
import { isAllowlistedAdmin } from './adminAllowlist'

describe('isAllowlistedAdmin', () => {
  it('matches an allowlisted name exactly', () => {
    expect(isAllowlistedAdmin('Jordan', 'Blake')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(isAllowlistedAdmin('jordan', 'BLAKE')).toBe(true)
    expect(isAllowlistedAdmin('JORDAN', 'blake')).toBe(true)
  })

  it('tolerates surrounding whitespace', () => {
    expect(isAllowlistedAdmin('  Jordan  ', '  Blake  ')).toBe(true)
  })

  it('rejects a name not on the allowlist', () => {
    expect(isAllowlistedAdmin('Jamie', 'Rivera')).toBe(false)
  })

  it('rejects a first name matching one entry paired with a last name from another', () => {
    expect(isAllowlistedAdmin('Jordan', 'Nguyen')).toBe(false)
  })

  it('rejects a partial substring match', () => {
    expect(isAllowlistedAdmin('Jordan', 'Blakely')).toBe(false)
  })
})
