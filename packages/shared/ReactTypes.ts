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

export type Usable<T> = Thenable<T> | ReactContext<T>

export interface Wakeable<Result = any> {
	then(
		onFulfilled: () => Result,
		onRejected: () => Result
	): void | Wakeable<Result>
}

interface ThenableImpl<T, Result, Err> {
	then(
		onFulfilled: (value: T) => Result,
		onRejected: (reason: Err) => Result
	): void | Wakeable<Result>
}

interface UntrackedThenable<T, Result, Err> extends ThenableImpl<T, Result, Err> {
	status?: void;
}

export interface PendingThenable<T, Result, Err> extends ThenableImpl<T, Result, Err> {
	status: 'pending';
}

export interface FulfilledThenable<T, Result, Err> extends ThenableImpl<T, Result, Err> {
	status: 'fulfilled';
	value: T;
}

export interface RejectedThenable<T, Result, Err> extends ThenableImpl<T, Result, Err> {
	status: 'rejected';
	reason: Err;
}

export type Thenable<T, Result = void, Err = any> =
	| UntrackedThenable<T, Result, Err>
	| PendingThenable<T, Result, Err>
	| FulfilledThenable<T, Result, Err>
	| RejectedThenable<T, Result, Err>
