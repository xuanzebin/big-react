import { HookDeps } from 'react-reconciler/src/fiberHooks'
import { Action, ReactContext, Usable } from 'shared/ReactTypes'

export interface Dispatcher {
	useState: <T>(initialState: () => T | T) => [T, Dispatch<T>]
	useEffect: (create: () => void | void, deps: any[] | void) => void
	useTransition: () => [boolean, (callback: () => void) => void]
	useRef: <T>(initialValue: T) => { current: T }
	useContext: <T>(context: ReactContext<T>) => T
	use: <T>(usable: Usable<T>) => T
	useCallback: <T>(callback: T, deps: HookDeps) => T
	useMemo: <T>(create: () => T, deps: HookDeps) => T
}

export type Dispatch<State> = (action: Action<State>) => void

export const currentDispatcher: { current: Dispatcher | null } = {
	current: null
}

export const resolveDispatcher = () => {
	const dispatcher = currentDispatcher.current

	if (dispatcher === null) {
		throw new Error('hooks 只能在函数组件中使用')
	}

	return dispatcher
}
