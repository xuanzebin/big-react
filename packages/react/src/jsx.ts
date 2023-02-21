import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { Type, Key, Ref, Props, ElementType } from 'shared/ReactTypes'

const ReactElement = function (type: Type, key: Key, ref: Ref, props: Props) {
	const element = {
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

		const maybeChildrenLength = maybeChildren.length
		if (maybeChildrenLength) {
			if (maybeChildrenLength === 1) {
				props.children = maybeChildren[0]
			} else {
				props.children = maybeChildren
			}
		}
	}

	return ReactElement(type, key, ref, props)
}

export const jsxDev = jsx
