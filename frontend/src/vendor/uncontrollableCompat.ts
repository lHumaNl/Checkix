import {
  Component,
  createElement,
  forwardRef,
  useCallback,
  useState,
  type ComponentType,
  type ForwardedRef,
} from 'react'

type Props = Record<string, unknown>
type Handler = (...args: unknown[]) => unknown
type ControlMap = Record<string, string>

interface CompatProps extends Props {
  innerRef?: ForwardedRef<unknown>
}

interface CompatState {
  values: Props
}

export function defaultKey(key: string) {
  return `default${key.charAt(0).toUpperCase()}${key.slice(1)}`
}

export function useUncontrolledProp(propValue: unknown, defaultValue: unknown, handler?: Handler) {
  const [stateValue, setState] = useState(defaultValue)
  const isProp = propValue !== undefined

  const setValue = useCallback((value: unknown, ...args: unknown[]) => {
    handler?.(value, ...args)
    setState(value)
  }, [handler])

  return [isProp ? propValue : stateValue, setValue] as const
}

export function useUncontrolled<TProps extends Props>(props: TProps, config: ControlMap) {
  let result: Props = props

  for (const [fieldName, handlerName] of Object.entries(config)) {
    // The dependency API provides a static control map per wrapped component.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, handler] = useUncontrolledProp(
      result[fieldName],
      result[defaultKey(fieldName)],
      props[handlerName] as Handler | undefined
    )
    result = { ...result, [fieldName]: value, [handlerName]: handler }
  }

  return result
}

export function uncontrollable(WrappedComponent: ComponentType<Props>, controlledValues: ControlMap) {
  class UncontrolledComponent extends Component<CompatProps, CompatState> {
    state: CompatState = { values: {} }

    private getHandler(propName: string, handlerName: string) {
      return (value: unknown, ...args: unknown[]) => {
        const handler = this.props[handlerName] as Handler | undefined
        handler?.(value, ...args)
        this.setState(({ values }) => ({ values: { ...values, [propName]: value } }))
      }
    }

    private getValue(propName: string) {
      const propValue = this.props[propName]
      if (propValue !== undefined) return propValue
      return this.state.values[propName] ?? this.props[defaultKey(propName)]
    }

    render() {
      const { innerRef, ...props } = this.props
      const nextProps: Props = { ...props }

      Object.entries(controlledValues).forEach(([propName, handlerName]) => {
        nextProps[propName] = this.getValue(propName)
        nextProps[handlerName] = this.getHandler(propName, handlerName)
        delete nextProps[defaultKey(propName)]
      })

      return createElement(WrappedComponent, { ...nextProps, ref: innerRef })
    }
  }

  return forwardRef((props: Props, ref: ForwardedRef<unknown>) => (
    createElement(UncontrolledComponent, { ...props, innerRef: ref })
  ))
}
