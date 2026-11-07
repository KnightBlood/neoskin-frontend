import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntApp,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
} from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import { fetchOptionsGroup, saveOptionsGroup } from '../api/admin'

export type OptionGroup = 'options' | 'customize' | 'score' | 'resource'

type FieldKind = 'text' | 'textarea' | 'number' | 'switch' | 'select'

interface FieldMeta {
  key: string
  label: string
  kind: FieldKind
  hint?: string
  rows?: number
  options?: Array<{ label: string; value: string }>
}

const NAVBAR_COLORS = [
  'primary', 'secondary', 'success', 'danger', 'indigo', 'purple', 'pink',
  'teal', 'cyan', 'dark', 'gray', 'fuchsia', 'maroon', 'olive', 'navy',
  'lime', 'light', 'warning', 'white', 'orange',
]
const SIDEBAR_COLORS = [
  'primary', 'warning', 'info', 'danger', 'success', 'indigo', 'navy',
  'purple', 'fuchsia', 'pink', 'maroon', 'orange', 'lime', 'teal', 'olive',
]

const colorOptions = (colors: string[]) => colors.map((color) => ({ label: color, value: color }))

const GROUPS: Record<OptionGroup, FieldMeta[]> = {
  options: [
    { key: 'site_name', label: '站点名称', kind: 'text' },
    { key: 'site_description', label: '站点描述', kind: 'textarea', rows: 3 },
    { key: 'site_url', label: '站点地址', kind: 'text', hint: '例如 https://example.com' },
    { key: 'register_with_player_name', label: '允许以角色名注册', kind: 'switch' },
    { key: 'require_verification', label: '要求邮箱验证', kind: 'switch' },
    { key: 'regs_per_ip', label: '单 IP 注册数', kind: 'number' },
    { key: 'max_upload_file_size', label: '上传大小上限（KB）', kind: 'number' },
    { key: 'max_texture_width', label: '材质宽度上限（px）', kind: 'number' },
    {
      key: 'player_name_rule',
      label: '角色名规则',
      kind: 'select',
      options: [
        { label: '官方（拉丁字母/数字/下划线）', value: 'official' },
        { label: 'CJK（允许汉字）', value: 'cjk' },
        { label: 'UTF-8', value: 'utf8' },
        { label: '自定义', value: 'custom' },
      ],
    },
    { key: 'custom_player_name_regexp', label: '自定义角色名正则', kind: 'text' },
    { key: 'player_name_length_min', label: '角色名最短长度', kind: 'number' },
    { key: 'player_name_length_max', label: '角色名最长长度', kind: 'number' },
    { key: 'auto_del_invalid_texture', label: '自动删除无效材质', kind: 'switch' },
    { key: 'allow_downloading_texture', label: '允许下载材质', kind: 'switch' },
    { key: 'status_code_for_private', label: '私密材质状态码', kind: 'number' },
    { key: 'texture_name_regexp', label: '材质名正则', kind: 'text' },
    { key: 'content_policy', label: '内容政策', kind: 'textarea', rows: 4 },
    { key: 'meta_keywords', label: 'Meta Keywords', kind: 'text' },
    { key: 'meta_description', label: 'Meta Description', kind: 'textarea', rows: 2 },
    { key: 'meta_extras', label: 'Meta Extras', kind: 'textarea', rows: 2 },
    { key: 'recaptcha_sitekey', label: 'reCAPTCHA Site Key', kind: 'text' },
    { key: 'recaptcha_secretkey', label: 'reCAPTCHA Secret Key', kind: 'text' },
    { key: 'recaptcha_invisible', label: 'reCAPTCHA 不可见模式', kind: 'switch' },
    { key: 'update_source', label: '更新源', kind: 'text' },
    { key: 'plugin_market_source', label: '插件市场源', kind: 'text' },
  ],
  customize: [
    { key: 'home_pic_url', label: '首页背景图 URL', kind: 'text' },
    { key: 'favicon_url', label: 'Favicon URL', kind: 'text' },
    { key: 'transparent_navbar', label: '透明导航栏', kind: 'switch' },
    { key: 'hide_intro', label: '隐藏首页介绍', kind: 'switch' },
    { key: 'fixed_bg', label: '固定背景', kind: 'switch' },
    {
      key: 'copyright_prefer',
      label: '版权文案',
      kind: 'select',
      options: [
        { label: 'Powered with ❤ by Blessing Skin Server.', value: '0' },
        { label: 'Powered by Blessing Skin Server.', value: '1' },
        { label: 'Proudly powered by Blessing Skin Server.', value: '2' },
        { label: '由 Blessing Skin Server 强力驱动。', value: '3' },
        { label: '采用 Blessing Skin Server 搭建。', value: '4' },
        { label: '使用 Blessing Skin Server 稳定运行。', value: '5' },
        { label: '自豪地采用 Blessing Skin Server。', value: '6' },
      ],
    },
    { key: 'copyright_text', label: '自定义版权文本', kind: 'textarea', rows: 3 },
    { key: 'custom_css', label: '自定义 CSS', kind: 'textarea', rows: 5 },
    { key: 'custom_js', label: '自定义 JavaScript', kind: 'textarea', rows: 5 },
    { key: 'navbar_color', label: '导航栏配色', kind: 'select', options: colorOptions(NAVBAR_COLORS) },
    { key: 'sidebar_color', label: '侧栏配色', kind: 'select', options: colorOptions(SIDEBAR_COLORS) },
  ],
  score: [
    { key: 'score_per_storage', label: '每 KB 存储消耗积分', kind: 'number' },
    { key: 'private_score_per_storage', label: '私密材质每 KB 消耗积分', kind: 'number' },
    { key: 'score_per_closet_item', label: '每个衣柜收藏消耗积分', kind: 'number' },
    { key: 'return_score', label: '删除时返还积分', kind: 'switch' },
    { key: 'score_per_player', label: '每个角色消耗积分', kind: 'number' },
    { key: 'user_initial_score', label: '初始积分', kind: 'number' },
    { key: 'reporter_score_modification', label: '举报扣除积分（负数为扣除）', kind: 'number' },
    { key: 'reporter_reward_score', label: '举报奖励积分', kind: 'number' },
    { key: 'sign_score_from', label: '签到最少积分', kind: 'number' },
    { key: 'sign_score_to', label: '签到最多积分', kind: 'number' },
    { key: 'sign_gap_time', label: '签到场隔（小时）', kind: 'number' },
    { key: 'sign_after_zero', label: '每日 0 点后可签到', kind: 'switch' },
    { key: 'score_award_per_texture', label: '上传奖励积分', kind: 'number' },
    { key: 'take_back_scores_after_deletion', label: '删除时扣除奖励积分', kind: 'switch' },
    { key: 'score_award_per_like', label: '被收藏奖励积分', kind: 'number' },
  ],
  resource: [
    { key: 'force_ssl', label: '强制 HTTPS', kind: 'switch' },
    { key: 'auto_detect_asset_url', label: '自动检测资源地址', kind: 'switch' },
    { key: 'cdn_address', label: 'CDN 地址', kind: 'text' },
    { key: 'cache_expire_time', label: '缓存时间（秒）', kind: 'number' },
    { key: 'enable_avatar_cache', label: '启用头像缓存', kind: 'switch' },
    { key: 'enable_preview_cache', label: '启用预览缓存', kind: 'switch' },
    { key: 'allow_downloading_texture', label: '允许下载材质', kind: 'switch' },
  ],
}

const TITLES: Record<OptionGroup, string> = {
  options: '站点配置',
  customize: '配色 / 首页',
  score: '积分',
  resource: '资源',
}

export function OptionsPage({ group }: { group: OptionGroup }) {
  const { http } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const fields = GROUPS[group]
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [busy, setBusy] = useState(false)

  const options = useQuery({
    queryKey: ['admin-options', group],
    queryFn: () => fetchOptionsGroup(http, group),
  })

  useEffect(() => {
    if (!options.data) {
      return
    }
    const next: Record<string, unknown> = {}
    for (const field of fields) {
      const raw = options.data[field.key] ?? ''
      if (field.kind === 'switch') {
        next[field.key] = raw === true || raw === 'true' || raw === '1' || raw === 1
      } else if (field.kind === 'number') {
        if (raw === '' || raw === null || raw === undefined) {
          next[field.key] = undefined
        } else {
          const parsed = Number(raw)
          next[field.key] = Number.isFinite(parsed) ? parsed : undefined
        }
      } else {
        next[field.key] = String(raw)
      }
    }
    setValues(next)
  }, [options.data, group, fields])

  function update(key: string, value: unknown) {
    setValues((previous) => ({ ...previous, [key]: value }))
  }

  async function submit() {
    setBusy(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const field of fields) {
        payload[field.key] = values[field.key] ?? (field.kind === 'switch' ? false : '')
      }
      const result = await saveOptionsGroup(http, group, payload)
      message.success(result.message || '保存成功')
      await queryClient.invalidateQueries({ queryKey: ['admin-options', group] })
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
    } catch (error) {
      message.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{TITLES[group]}</h1>
        <Button type="primary" loading={busy} onClick={() => void submit()}>
          {t('general.submit', '保存')}
        </Button>
      </header>

      {options.isError ? (
        <p className="admin-error">{normalizeApiError(options.error).message}</p>
      ) : null}

      <Card loading={options.isPending}>
        <Form layout="vertical" className="admin-options-form">
          {fields.map((field) => (
            <Form.Item
              key={field.key}
              label={field.label}
              extra={field.hint}
              className={field.kind === 'textarea' || field.kind === 'text' ? undefined : 'admin-form-narrow'}
            >
              {field.kind === 'text' ? (
                <Input
                  value={String(values[field.key] ?? '')}
                  onChange={(event) => update(field.key, event.target.value)}
                />
              ) : null}
              {field.kind === 'textarea' ? (
                <Input.TextArea
                  rows={field.rows ?? 3}
                  value={String(values[field.key] ?? '')}
                  onChange={(event) => update(field.key, event.target.value)}
                />
              ) : null}
              {field.kind === 'number' ? (
                <InputNumber
                  style={{ width: '100%' }}
                  value={values[field.key] as number | undefined}
                  onChange={(next) => update(field.key, next ?? '')}
                />
              ) : null}
              {field.kind === 'switch' ? (
                <Switch
                  checked={Boolean(values[field.key])}
                  onChange={(checked) => update(field.key, checked)}
                />
              ) : null}
              {field.kind === 'select' ? (
                <Select
                  style={{ width: '100%' }}
                  value={String(values[field.key] ?? '')}
                  options={field.options}
                  onChange={(next) => update(field.key, next)}
                />
              ) : null}
            </Form.Item>
          ))}
        </Form>
      </Card>
    </section>
  )
}
