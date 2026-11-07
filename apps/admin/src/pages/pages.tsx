import type { ReactNode } from 'react'

function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      {children}
    </section>
  )
}

export const CommunicationsPage = () => <Page title="通信">P5 将实现通信列表。</Page>
export const CommunicationEditPage = () => <Page title="通信编辑器">P5 将实现通信编辑器。</Page>
export const NotFoundPage = () => <Page title="404">页面不存在。</Page>
