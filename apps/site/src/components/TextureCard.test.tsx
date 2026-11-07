import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { createInstance, type i18n as I18nInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import type { LibraryItem } from '../api/skinlib'
import { TextureCard } from './TextureCard'

let i18n: I18nInstance

beforeAll(async () => {
  i18n = createInstance()
  await i18n.init({
    lng: 'zh_CN',
    resources: {
      zh_CN: {
        translation: {
          general: { cape: '披风' },
          skinlib: {
            private: '私密',
            addToCloset: '添加至衣柜',
            removeFromCloset: '从衣柜中移除',
            show: { uploader: '上传者' },
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  })
})

const item: LibraryItem = {
  tid: 7,
  name: 'My Skin',
  type: 'alex',
  uploader: 3,
  public: false,
  likes: 5,
  nickname: 'Steve',
}

function renderCard(overrides: Partial<LibraryItem> = {}, liked = false) {
  const onToggleLike = vi.fn()
  const onUploaderClick = vi.fn()
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <TextureCard
          item={{ ...item, ...overrides }}
          liked={liked}
          onToggleLike={onToggleLike}
          onUploaderClick={onUploaderClick}
        />
      </MemoryRouter>
    </I18nextProvider>,
  )
  return { onToggleLike, onUploaderClick }
}

describe('TextureCard', () => {
  it('renders name, model, likes and privacy marker', () => {
    renderCard()
    expect(screen.getByText('My Skin')).toBeTruthy()
    expect(screen.getByText('Alex')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByTitle('私密')).toBeTruthy()
  })

  it('toggles closet state', () => {
    const { onToggleLike } = renderCard()
    fireEvent.click(screen.getByLabelText('添加至衣柜'))
    expect(onToggleLike).toHaveBeenCalledWith(item)
  })

  it('filters by uploader', () => {
    const { onUploaderClick } = renderCard()
    fireEvent.click(screen.getByText('Steve'))
    expect(onUploaderClick).toHaveBeenCalledWith(3)
  })

  it('shows the cape label', () => {
    renderCard({ type: 'cape' })
    expect(screen.getByText('披风')).toBeTruthy()
  })
})
