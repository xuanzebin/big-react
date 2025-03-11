import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, REACT_SUSPENSE_TYPE } from 'shared/ReactSymbols'
import {
	Type,
	Key,
	Ref,
	Props,
	ElementType,
	ReactElementType
} from 'shared/ReactTypes'

const ReactElement = function (type: Type, key: Key, ref: Ref, props: Props) {
	const element: ReactElementType = {
		key,
		ref,
		type,
		props,
		__mark: 'XiaoP',
		$$typeof: REACT_ELEMENT_TYPE
	}

	return element
}

export function jsx(type: ElementType, config: any, ...maybeChildren: any) {
	let key: Key = null
	let ref: Ref = null
	const props: Props = {}

	for (const prop in config) {
		const val = config[prop]

		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val
			}

			continue
		}

		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val
			}

			continue
		}

		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = val
		}
	}

	const maybeChildrenLength = maybeChildren.length
	if (maybeChildrenLength) {
		if (maybeChildrenLength === 1) {
			props.children = maybeChildren[0]
		} else {
			props.children = maybeChildren
		}
	}

	return ReactElement(type, key, ref, props)
}

export const Fragment = REACT_FRAGMENT_TYPE

export const Suspense = REACT_SUSPENSE_TYPE

export const isValidElement = function (object: any) {
	return (
		typeof object === 'object' &&
		object !== null &&
		object.$$typeof === REACT_ELEMENT_TYPE
	)
}

export const jsxDEV = function (type: ElementType, config: any) {
	let key: Key = null
	let ref: Ref = null
	const props: Props = {}

	for (const prop in config) {
		const val = config[prop]

		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val
			}

			continue
		}

		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val
			}

			continue
		}

		if ({}.hasOwnProperty.call(config, prop)) {
			props[prop] = val
		}
	}

	return ReactElement(type, key, ref, props)
}
