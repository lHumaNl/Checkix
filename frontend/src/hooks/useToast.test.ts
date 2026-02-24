import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reducer, toast } from '@/hooks/useToast'
import { renderHook, act } from '@testing-library/react'
import type { ToastProps } from '@/components/ui/Toast'

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
}

const createToast = (id: string, title: string): ToasterToast => ({
  id,
  title,
  open: true,
})

describe('useToast reducer', () => {
  it('ADD_TOAST adds a toast to the beginning', () => {
    const state = { toasts: [createToast('1', 'first')] }
    const newToast = createToast('2', 'second')
    
    const result = reducer(state, { type: 'ADD_TOAST', toast: newToast })
    
    expect(result.toasts).toHaveLength(2)
    expect(result.toasts[0].id).toBe('2')
  })

  it('UPDATE_TOAST updates matching toast', () => {
    const state = {
      toasts: [createToast('1', 'original')],
    }
    
    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'updated' },
    })
    
    expect(result.toasts[0].title).toBe('updated')
  })

  it('DISMISS_TOAST marks toast as closed', () => {
    const state = {
      toasts: [createToast('1', 'test')],
    }
    
    const result = reducer(state, {
      type: 'DISMISS_TOAST',
      toastId: '1',
    })
    
    expect(result.toasts[0].open).toBe(false)
  })

  it('REMOVE_TOAST removes specific toast', () => {
    const state = {
      toasts: [createToast('1', '1'), createToast('2', '2')],
    }
    
    const result = reducer(state, {
      type: 'REMOVE_TOAST',
      toastId: '1',
    })
    
    expect(result.toasts).toHaveLength(1)
    expect(result.toasts[0].id).toBe('2')
  })

  it('REMOVE_TOAST without id clears all toasts', () => {
    const state = {
      toasts: [createToast('1', '1'), createToast('2', '2')],
    }
    
    const result = reducer(state, {
      type: 'REMOVE_TOAST',
    })
    
    expect(result.toasts).toHaveLength(0)
  })
})

describe('toast function', () => {
  it('returns id, dismiss, and update functions', () => {
    const result = toast({ title: 'Test' })
    
    expect(result.id).toBeDefined()
    expect(typeof result.dismiss).toBe('function')
    expect(typeof result.update).toBe('function')
  })
})
