import type { TextureType } from '../api/skinlib'

/** 2D 预览（默认 WebP，由 Accept 或 `png` 查询决定）。 */
export function previewUrl(tid: number, height = 150): string {
  return `/preview/${tid}?height=${height}`
}

/** `<picture>` 的 PNG 回退（老浏览器）。 */
export function previewPngUrl(tid: number, height = 150): string {
  return `${previewUrl(tid, height)}&png=1`
}

/** 原始纹理地址，供 3D 预览加载。 */
export function textureUrl(hash: string): string {
  return `/textures/${encodeURIComponent(hash)}`
}

/** 原始纹理下载（需要站点开启 `allow_downloading_texture`）。 */
export function rawTextureUrl(tid: number): string {
  return `/raw/${tid}`
}

export function avatarUrl(tid: number): string {
  return `/avatar/${tid}`
}

/** 文件大小（字节）→ 计费 KB，与 PHP `Math.ceil(size / 1024)` 一致。 */
export function uploadCostKb(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 0
  }
  return Math.ceil(bytes / 1024)
}

export interface CostOptions {
  scorePerStorage: number
  privateScorePerStorage: number
  closetItemCost: number
  award: number
}

/** 上传积分预估，公式与 `SkinlibController@handleUpload` 一致。 */
export function estimateUploadCost(
  bytes: number,
  isPrivate: boolean,
  options: CostOptions,
): number {
  const kb = uploadCostKb(bytes)
  const ratio = isPrivate ? options.privateScorePerStorage : options.scorePerStorage
  return kb * ratio + options.closetItemCost - options.award
}

/**
 * 上传前尺寸预检（后端仍会再次校验）。
 * 返回中文错误；通过时返回 `null`。
 */
export function validateTextureSize(
  width: number,
  height: number,
  type: TextureType,
  maxWidth: number,
): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '无法读取图片尺寸。'
  }
  if (maxWidth > 0 && width > maxWidth) {
    return `材质宽度为 ${width} px，超过站点上限 ${maxWidth} px。`
  }
  if (width % 64 !== 0 || height % 32 !== 0) {
    return `材质尺寸 ${width}×${height} 不是 64×32 的整数倍。`
  }
  const ratio = width / height
  if (type === 'cape') {
    if (ratio !== 2) {
      return `披风尺寸 ${width}×${height} 必须为 2:1。`
    }
    return null
  }
  if ((ratio !== 2 && ratio !== 1) || (type === 'alex' && ratio === 2)) {
    return `材质尺寸 ${width}×${height} 与模型 ${type} 不匹配。`
  }
  return null
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

/**
 * 判断皮肤是否为 Alex（slim）模型：64×64 皮肤中 x∈[46,48)、y∈[52,64)
 * 必须为空（透明或纯黑），与 PHP `isAlex` 判定一致。
 */
export async function isAlexTexture(src: string): Promise<boolean> {
  try {
    const image = await loadImage(src)
    if (image.width !== image.height) {
      return false
    }
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')
    if (!context) {
      return false
    }
    context.imageSmoothingEnabled = false
    context.drawImage(image, 0, 0, 64, 64)
    for (let x = 46; x < 48; x += 1) {
      for (let y = 52; y < 64; y += 1) {
        const data = context.getImageData(x, y, 1, 1).data
        const alpha = data[3] ?? 0
        const red = data[0] ?? 0
        const green = data[1] ?? 0
        const blue = data[2] ?? 0
        const filled = alpha !== 0 && !(red === 0 && green === 0 && blue === 0)
        if (filled) {
          return false
        }
      }
    }
    return true
  } catch {
    return false
  }
}

export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: image.width, height: image.height })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    image.src = url
  })
}
