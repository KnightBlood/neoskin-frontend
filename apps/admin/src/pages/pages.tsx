import type { ReactNode } from 'react'

function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      {children}
    </section>
  )
}

export const NotFoundPage = () => <Page title="404">页面不存在。</Page>
