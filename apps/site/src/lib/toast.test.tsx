import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { ToastHost, clearToasts, dismissToast, showToast } from './toast'

describe('toast', () => {
  afterEach(() => {
    vi.useRealTimers()
    clearToasts()
  })

  it('renders queued messages through the host', () => {
    render(<ToastHost />)
    act(() => {
      showToast('success', '保存成功')
    })
    expect(screen.getByText('保存成功')).toBeTruthy()
    act(() => {
      dismissToast(1)
    })
    expect(screen.queryByText('保存成功')).toBeNull()
  })

  it('falls back to a default text when the backend message is empty', () => {
    render(<ToastHost />)
    act(() => {
      showToast('error', '')
    })
    expect(screen.getByText('操作失败')).toBeTruthy()
  })

  it('auto-dismisses after the duration', () => {
    vi.useFakeTimers()
    render(<ToastHost />)
    act(() => {
      showToast('info', '提示内容', 1000)
    })
    expect(screen.getByText('提示内容')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(screen.queryByText('提示内容')).toBeNull()
  })
})
