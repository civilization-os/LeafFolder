import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmContextType {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  alert: (opts: ConfirmOptions) => Promise<void>
}

const ConfirmCtx = createContext<ConfirmContextType>({
  confirm: async () => false,
  alert: async () => {},
})

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    resolve: (value: boolean | PromiseLike<boolean>) => void
    options: ConfirmOptions
  } | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setState({ resolve, options: opts })
    })
  }, [])

  const alert = useCallback((opts: ConfirmOptions) => {
    return new Promise<void>(resolve => {
      setState({
        resolve: (value: boolean | PromiseLike<boolean>) => { resolve() },
        options: { ...opts, confirmLabel: opts.confirmLabel || '确定', cancelLabel: undefined },
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state?.resolve(true)
    setState(null)
  }, [state])

  const handleCancel = useCallback(() => {
    state?.resolve(false)
    setState(null)
  }, [state])

  const isAlert = state && !state.options.cancelLabel

  return (
    <ConfirmCtx.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmDialog
        open={!!state}
        title={state?.options.title || ''}
        message={state?.options.message || ''}
        confirmLabel={state?.options.confirmLabel}
        cancelLabel={isAlert ? undefined : state?.options.cancelLabel}
        danger={state?.options.danger}
        onConfirm={handleConfirm}
        onCancel={isAlert ? handleConfirm : handleCancel}
      />
    </ConfirmCtx.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmCtx)
}
