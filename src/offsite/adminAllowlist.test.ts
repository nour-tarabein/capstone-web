import { describe, expect, it } from 'vitest'
import { isAllowlistedAdmin } from './adminAllowlist'

describe('isAllowlistedAdmin', () => {
  it('matches an allowlisted name exactly', () => {
    expect(isAllowlistedAdmin('Abhinav', 'Pappu')).toBe(true)
  })

  it('matches case-insensitively', () => {
    expect(isAllowlistedAdmin('abhinav', 'PAPPU')).toBe(true)
    expect(isAllowlistedAdmin('ABHINAV', 'pappu')).toBe(true)
  })

  it('tolerates surrounding whitespace', () => {
    expect(isAllowlistedAdmin('  Abhinav  ', '  Pappu  ')).toBe(true)
  })

  it('rejects a name not on the allowlist', () => {
    expect(isAllowlistedAdmin('Jamie', 'Rivera')).toBe(false)
  })

  it('rejects a first name matching one entry paired with a last name from another', () => {
    expect(isAllowlistedAdmin('Abhinav', 'Tarabein')).toBe(false)
  })

  it('rejects a partial substring match', () => {
    expect(isAllowlistedAdmin('Abhinav', 'Pappuly')).toBe(false)
  })
})
