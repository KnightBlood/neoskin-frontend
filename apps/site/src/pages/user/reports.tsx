import { useState } from 'react'
import { Link } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../../app/context'
import { EndpointUnavailableError, fetchReports } from '../../api/user'

const STATUS_LABELS = ['正在处理', '处理完成', '已被拒绝']

export function reportStatusLabel(status: number): string {
  return STATUS_LABELS[status] ?? STATUS_LABELS[0]!
}

/** `/user/reports`：我提交的举报记录。 */
export function ReportsPage() {
  const { http } = useApp()
  const [page, setPage] = useState(1)

  const reports = useQuery({
    queryKey: ['user-reports', page],
    queryFn: () => fetchReports(http, page),
    placeholderData: keepPreviousData,
    retry: false,
  })

  const items = reports.data?.data ?? []
  const missing =
    reports.isError &&
    (reports.error instanceof EndpointUnavailableError ||
      normalizeApiError(reports.error).status === 404)

  return (
    <section className="user-page">
      <header className="user-page-header">
        <h1>{'我的举报'}</h1>
        <span className="user-page-subtitle">共 {reports.data?.total ?? 0} 条</span>
      </header>

      {missing ? (
        <div className="user-banner user-banner-info">
          <div>
            <strong>该页面需要后端补齐契约端点</strong>
            <p>
              <code>GET /api/user/reports</code> 尚未在四个端口实现，当前可先使用
              <a href="/user/reports"> 传统页面 </a>
              查看。
            </p>
          </div>
        </div>
      ) : null}

      {reports.isError && !missing ? (
        <p className="user-empty">{normalizeApiError(reports.error).message}</p>
      ) : null}

      <div className="user-card">
        <div className="user-card-body user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>材质 ID</th>
                <th>举报原因</th>
                <th style={{ width: '120px' }}>状态</th>
                <th style={{ width: '200px' }}>举报时间</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="user-table-empty">
                    {reports.isPending ? '加载中…' : '暂无举报记录。'}
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={`${item.tid}-${item.id ?? index}`}>
                    <td>
                      {item.tid}
                      {item.texture_name ? ` · ${item.texture_name}` : ''}{' '}
                      <Link to={`/skinlib/show/${item.tid}`} title="查看材质">
                        ↗
                      </Link>
                    </td>
                    <td>{item.reason}</td>
                    <td>
                      <span className={`user-badge user-badge-status-${item.status}`}>
                        {reportStatusLabel(item.status)}
                      </span>
                    </td>
                    <td>{item.report_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(reports.data?.last_page ?? 1) > 1 ? (
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
              {page} / {reports.data?.last_page ?? 1}
            </span>
            <button
              type="button"
              className="user-page-button"
              disabled={page >= (reports.data?.last_page ?? 1)}
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
