import { describe, expect, it } from 'vitest'
import {
  estimateUploadCost,
  previewPngUrl,
  previewUrl,
  uploadCostKb,
  validateTextureSize,
} from './texture'

describe('texture helpers', () => {
  it('builds 2D preview URLs', () => {
    expect(previewUrl(12)).toBe('/preview/12?height=150')
    expect(previewUrl(12, 400)).toBe('/preview/12?height=400')
    expect(previewPngUrl(12, 400)).toBe('/preview/12?height=400&png=1')
  })

  it('rounds file sizes up to the next KB', () => {
    expect(uploadCostKb(0)).toBe(0)
    expect(uploadCostKb(1)).toBe(1)
    expect(uploadCostKb(1024)).toBe(1)
    expect(uploadCostKb(1025)).toBe(2)
    expect(uploadCostKb(Number.NaN)).toBe(0)
  })

  it('estimates upload cost like the backend', () => {
    expect(
      estimateUploadCost(1025, false, {
        scorePerStorage: 1,
        privateScorePerStorage: 10,
        closetItemCost: 5,
        award: 2,
      }),
    ).toBe(5)
    expect(
      estimateUploadCost(2048, true, {
        scorePerStorage: 1,
        privateScorePerStorage: 10,
        closetItemCost: 0,
        award: 0,
      }),
    ).toBe(20)
  })

  it('accepts valid texture dimensions', () => {
    expect(validateTextureSize(64, 64, 'steve', 8192)).toBeNull()
    expect(validateTextureSize(64, 32, 'steve', 8192)).toBeNull()
    expect(validateTextureSize(128, 128, 'alex', 8192)).toBeNull()
    expect(validateTextureSize(64, 32, 'cape', 8192)).toBeNull()
  })

  it('rejects mismatched dimensions', () => {
    expect(validateTextureSize(64, 64, 'cape', 8192)).toContain('2:1')
    expect(validateTextureSize(64, 32, 'alex', 8192)).toContain('不匹配')
    expect(validateTextureSize(65, 65, 'steve', 8192)).toContain('整数倍')
    expect(validateTextureSize(8256, 128, 'steve', 8192)).toContain('上限')
    expect(validateTextureSize(0, 0, 'steve', 8192)).toContain('无法读取')
  })
})
