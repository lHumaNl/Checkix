import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test'))
    expect(result.current).toBe('test')
  })

  it('debounces value changes with default delay (300ms)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'changed' })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe('changed')
  })

  it('debounces with custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    rerender({ value: 'changed', delay: 500 })
    
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('changed')
  })

  it('cancels pending debounce on new value change', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'first' } }
    )

    rerender({ value: 'second' })
    
    act(() => {
      vi.advanceTimersByTime(200)
    })

    rerender({ value: 'third' })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('third')
  })

  it('handles different value types', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 0 } }
    )

    rerender({ value: 42 })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe(42)
  })

  it('handles object values', () => {
    const initial = { name: 'initial' }
    const changed = { name: 'changed' }
    
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: initial } }
    )

    rerender({ value: changed })
    
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toEqual(changed)
  })
})
