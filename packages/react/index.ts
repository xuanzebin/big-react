import { jsx, isValidElement as isValidElementFn } from './src/jsx'
import {
	Dispatcher,
	resolveDispatcher,
	currentDispatcher
} from './src/currentDispatcher'
import currentBatchConfig from './src/currentBatchConfig'

export const useState: Dispatcher['useState'] = (initialState: any) => {
	const dispatcher = resolveDispatcher()

	return dispatcher.useState(initialState)
}

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispatcher = resolveDispatcher()

	return dispatcher.useEffect(create, deps)
}

export const useTransition: Dispatcher['useTransition'] = () => {
	const dispatcher = resolveDispatcher()

	return dispatcher.useTransition()
}

export const useRef: Dispatcher['useRef'] = (initialValue) => {
	const dispatcher = resolveDispatcher()

	return dispatcher.useRef(initialValue)
}

export const useContext: Dispatcher['useContext'] = (context) => {
	const dispatcher = resolveDispatcher()

	return dispatcher.useContext(context)
}

export const use: Dispatcher['use'] = (usable) => {
	const dispatcher = resolveDispatcher()

	return dispatcher.use(usable)
}

export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher,
	currentBatchConfig
}

export const version = '0.0.0'

export const createElement = jsx

export const isValidElement = isValidElementFn

export * from './src/context'
export * from './src/jsx'

export default {
	version: '0.0.0',
	createElement: jsx
}
