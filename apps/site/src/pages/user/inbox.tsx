import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../../app/context'
import {
  EndpointUnavailableError,
  fetchInbox,
  fetchInboxMessage,
  inboxTitle,
} from '../../api/user'

function endpointMissing(error: unknown): boolean {
  return (
    error instanceof EndpointUnavailableError ||
    normalizeApiError(error).status === 404 ||
    normalizeApiError(error).status === 405
  )
}

function MissingEndpointNotice({ endpoint, legacy }: { endpoint: string; legacy: string }) {
  return (
    <div className="user-banner user-banner-info">
      <div>
        <strong>该页面需要后端补齐契约端点</strong>
        <p>
          <code>GET {endpoint}</code> 尚未在四个端口实现，当前可先使用
          <a href={legacy}> 传统页面 </a>
          查看。
        </p>
      </div>
    </div>
  )
}

/** `/user/inbox`：站内信列表。 */
export function InboxPage() {
  const { http } = useApp()
  const [page, setPage] = useState(1)

  const inbox = useQuery({
    queryKey: ['user-inbox', page],
    queryFn: () => fetchInbox(http, page),
    placeholderData: keepPreviousData,
    retry: false,
  })

  const items = inbox.data?.data ?? []

  return (
    <section className="user-page">
      <header className="user-page-header">
        <h1>{'站内信'}</h1>
        <span className="user-page-subtitle">
          共 {inbox.data?.total ?? 0} 条
          {inbox.data?.unread ? `（未读 ${inbox.data.unread}）` : ''}
        </span>
      </header>

      {inbox.isError ? (
        endpointMissing(inbox.error) ? (
          <MissingEndpointNotice endpoint="/api/user/inbox" legacy="/user/inbox" />
        ) : (
          <p className="user-empty">{normalizeApiError(inbox.error).message}</p>
        )
      ) : null}

      <div className="user-card">
        <div className="user-card-body user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>标题</th>
                <th style={{ width: '120px' }}>状态</th>
                <th style={{ width: '200px' }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="user-table-empty">
                    {inbox.isPending ? '加载中…' : '暂无站内信。'}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={String(item.id)}>
                    <td>
                      <Link to={`/user/inbox/${item.id}`}>{inboxTitle(item)}</Link>
                      {item.preview ? (
                        <div className="user-muted user-inbox-preview">{item.preview}</div>
                      ) : null}
                    </td>
                    <td>
                      {item.read_at ? (
                        <span className="user-badge">已读</span>
                      ) : (
                        <span className="user-badge user-badge-unread">未读</span>
                      )}
                    </td>
                    <td>{item.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(inbox.data?.last_page ?? 1) > 1 ? (
          <div className="user-card-footer user-pagination">
            <button
              type="button"
              className="user-page-button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              上一页
            </button>
            <span>
              {page} / {inbox.data?.last_page ?? 1}
            </span>
            <button
              type="button"
              className="user-page-button"
              disabled={page >= (inbox.data?.last_page ?? 1)}
              onClick={() => setPage((value) => value + 1)}
            >
              下一页
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

/** `/user/inbox/:id`：站内信详情（后端会自动标记已读）。 */
export function InboxMessagePage() {
  const { http } = useApp()
  const { id = '' } = useParams()

  const message = useQuery({
    queryKey: ['user-inbox-message', id],
    queryFn: () => fetchInboxMessage(http, id),
    enabled: Boolean(id),
    retry: false,
  })

  if (message.isError) {
    return (
      <section className="user-page">
        <header className="user-page-header">
          <h1>站内信</h1>
          <Link className="user-link" to="/user/inbox">
            返回站内信
          </Link>
        </header>
        {endpointMissing(message.error) ? (
          <MissingEndpointNotice endpoint={`/api/user/inbox/${id}`} legacy={`/user/inbox/${id}`} />
        ) : (
          <p className="user-empty">{normalizeApiError(message.error).message}</p>
        )}
      </section>
    )
  }

  if (!message.data) {
    return (
      <section className="user-page">
        <header className="user-page-header">
          <h1>站内信</h1>
        </header>
        <p className="user-empty">加载中…</p>
      </section>
    )
  }

  return (
    <section className="user-page">
      <header className="user-page-header">
        <h1>{inboxTitle(message.data)}</h1>
        <Link className="user-link" to="/user/inbox">
          返回站内信
        </Link>
      </header>
      <article className="user-card">
        <div className="user-card-body user-message-body">
          <div dangerouslySetInnerHTML={{ __html: message.data.content }} />
        </div>
        <div className="user-card-footer user-message-footer">
          <span className="user-muted">{message.data.created_at}</span>
        </div>
      </article>
    </section>
  )
}
