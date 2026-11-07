import { useEffect, useState } from 'react'
import { Message } from 'tdesign-react'

/**
 * 轻量级全局提示。
 *
 * TDesign 1.x 的 `MessagePlugin` 依赖 `ReactDOM.render`，在 React 19 中已被移除，
 * 调用会抛出 `reactRender is not a function`。这里改用声明式 `<Message>` + 自维护队列，
 * 行为与插件一致（自动消失、堆叠显示），且不依赖任何已废弃 API。
 */
export type ToastTheme = 'info' | 'success' | 'warning' | 'error'

interface ToastItem {
  id: number
  theme: ToastTheme
  content: string
}

let queue: ToastItem[] = []
let sequence = 0
const listeners = new Set<(items: ToastItem[]) => void>()

function publish() {
  const snapshot = queue.slice()
  for (const listener of listeners) {
    listener(snapshot)
  }
}

export function dismissToast(id: number) {
  queue = queue.filter((item) => item.id !== id)
  publish()
}

/** 清空所有提示（测试与退出登录时使用）。 */
export function clearToasts() {
  queue = []
  publish()
}

export function showToast(theme: ToastTheme, content: string, durationMs = 3200) {
  const text = content?.trim() ? content : DEFAULT_TEXT[theme]
  const id = ++sequence
  queue = [...queue, { id, theme, content: text }]
  publish()
  if (durationMs > 0) {
    window.setTimeout(() => dismissToast(id), durationMs)
  }
}

const DEFAULT_TEXT: Record<ToastTheme, string> = {
  info: '提示',
  success: '操作成功',
  warning: '请注意',
  error: '操作失败',
}

export const toast = {
  info: (content: string) => showToast('info', content),
  success: (content: string) => showToast('success', content),
  warning: (content: string) => showToast('warning', content),
  error: (content: string) => showToast('error', content),
}

/** 挂在站点布局内，渲染当前队列。 */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>(queue)

  useEffect(() => {
    listeners.add(setItems)
    setItems(queue.slice())
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {items.map((item) => (
        <Message
          key={item.id}
          theme={item.theme}
          content={item.content}
          duration={0}
        />
      ))}
    </div>
  )
}
