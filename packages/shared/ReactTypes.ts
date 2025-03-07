export type Type = any
export type Key = any
export type Ref = any
export type Props = any
export type ElementType = any

export interface ReactElementType {
	key: Key
	ref: Ref
	props: Props
	__mark: string
	type: ElementType
	$$typeof: symbol | number
}

export type Action<State> = State | ((prevState: State) => State)

export type ReactContext<T> = {
	$$typeof: symbol | number
	Provider: ReactProvider<T> | null
	_currentValue: T
}

export type ReactProvider<T> = {
	$$typeof: symbol | number
	_context: ReactContext<T>
}
