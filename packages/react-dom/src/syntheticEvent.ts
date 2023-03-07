import { Props } from 'shared/ReactTypes'

export const elementPropsKeys = '__props'

export interface DOMElement extends Element {
	[elementPropsKeys]: Props
}

export function updateFiberProps(node: DOMElement, props: Props) {
	node[elementPropsKeys] = props
}
