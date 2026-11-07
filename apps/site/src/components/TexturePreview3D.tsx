import { useEffect, useRef, useState } from 'react'
import { SkinViewer, WalkingAnimation } from 'skinview3d'

export interface TexturePreview3DProps {
  /** 皮肤纹理地址；披风预览时留空。 */
  skin?: string
  /** 披风纹理地址。 */
  cape?: string
  /** Alex（slim）模型。 */
  slim?: boolean
}

/**
 * 基于 skinview3d 的 3D 预览。
 * 作为独立 chunk 懒加载，避免皮肤库列表页下载 three.js。
 */
export default function TexturePreview3D({ skin, cape, slim = false }: TexturePreview3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<SkinViewer | null>(null)
  const [rotating, setRotating] = useState(true)
  const [walking, setWalking] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const parent = canvas.parentElement
    const width = parent?.clientWidth || canvas.clientWidth || 640
    const height = canvas.clientHeight || 420
    const viewer = new SkinViewer({
      canvas,
      width,
      height,
      skin: skin || undefined,
      cape: cape || undefined,
      model: slim ? 'slim' : 'default',
      zoom: 0.9,
    })
    viewer.autoRotate = true
    viewerRef.current = viewer

    const resize = () => {
      const nextWidth = parent?.clientWidth || canvas.clientWidth
      if (nextWidth > 0) {
        viewer.setSize(nextWidth, canvas.clientHeight || height)
      }
    }
    window.addEventListener('resize', resize)
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    if (parent) {
      observer?.observe(parent)
    }

    return () => {
      window.removeEventListener('resize', resize)
      observer?.disconnect()
      viewer.dispose()
      viewerRef.current = null
    }
    // 只在挂载时创建；资源变化由下面的 effect 处理。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) {
      return
    }
    if (skin) {
      void viewer.loadSkin(skin, { model: slim ? 'slim' : 'default' })
    }
    if (cape) {
      void viewer.loadCape(cape)
    } else {
      viewer.resetCape()
    }
  }, [skin, cape, slim])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) {
      return
    }
    viewer.animation = walking ? new WalkingAnimation() : null
  }, [walking])

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.autoRotate = rotating
    }
  }, [rotating])

  return (
    <div className="texture-viewer">
      <canvas ref={canvasRef} className="texture-viewer-canvas" />
      <div className="texture-viewer-actions">
        <button type="button" onClick={() => setRotating((value) => !value)}>
          {rotating ? '暂停旋转' : '自动旋转'}
        </button>
        <button type="button" onClick={() => setWalking((value) => !value)}>
          {walking ? '停止动画' : '行走动画'}
        </button>
      </div>
    </div>
  )
}
