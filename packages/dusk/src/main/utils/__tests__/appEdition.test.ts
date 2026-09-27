import { describe, expect, it } from 'vitest'

import { getApplicationId } from '../appEdition'

describe('getApplicationId', () => {
  it('returns the single global application id', () => {
    expect(getApplicationId()).toBe('com.dusk.app')
  })
})
