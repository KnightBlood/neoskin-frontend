import { useEffect, useState, type ReactNode } from 'react'
import { Dialog, Input } from 'tdesign-react'

export interface PromptDialogProps {
  visible: boolean
  title: string
  description?: ReactNode
  defaultValue?: string
  placeholder?: string
  confirmText?: string
  busy?: boolean
  validator?: (value: string) => string | undefined
  onCancel: () => void
  onConfirm: (value: string) => void
}

/** 受控的文本输入对话框（TDesign 没有内置 prompt）。 */
export function PromptDialog({
  visible,
  title,
  description,
  defaultValue = '',
  placeholder,
  confirmText = '确定',
  busy = false,
  validator,
  onCancel,
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    if (visible) {
      setValue(defaultValue)
    }
  }, [visible, defaultValue])

  const error = validator?.(value)

  return (
    <Dialog
      visible={visible}
      header={title}
      closeOnOverlayClick={!busy}
      closeOnEscKeydown={!busy}
      confirmBtn={{ content: confirmText, loading: busy }}
      cancelBtn={{ content: '取消', disabled: busy }}
      onClose={onCancel}
      onCancel={onCancel}
      onConfirm={() => {
        if (!error) {
          onConfirm(value)
        }
      }}
    >
      <div className="prompt-dialog">
        {description ? <p className="prompt-dialog-description">{description}</p> : null}
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(next) => setValue(String(next))}
        />
        {error ? <em className="prompt-dialog-error">{error}</em> : null}
      </div>
    </Dialog>
  )
}
