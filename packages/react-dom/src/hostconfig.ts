import { FiberNode } from 'react-reconciler/src/fiber'
import { HostComponent, HostText } from 'react-reconciler/src/workTags'
import { DOMElement, updateFiberProps } from './syntheticEvent'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

export const createInstance = (type: string, props: any): Instance => {
	const instance: Element = document.createElement(type)

	updateFiberProps(instance as DOMElement, props)

	return instance
}

export const createTextNodeInstance = (content: string) => {
	return document.createTextNode(content)
}

export const appendInitialChild = (
	child: Instance,
	parent: Instance | Container
) => {
	return parent.appendChild(child)
}

export const insertBeforeChild = (child: Instance, before: Instance) => {
	return before.insertBefore(child)
}

export const appendChildToContainer = appendInitialChild

export const commitUpdate = (fiber: FiberNode) => {
	switch (fiber.tag) {
		case HostComponent:
			// TODO
			break
		case HostText:
			const text = fiber.memoizedProps.content

			return commitTextUpdate(fiber.stateNode, text)
		default:
			if (__DEV__) {
				console.warn('未实现的 commitUpdate 类型', fiber)
			}
			return
	}
}

export const commitTextUpdate = (text: TextInstance, content: string) => {
	text.textContent = content
}

export const removeChild = (
	childNode: Element | TextInstance,
	parent: Element
) => {
	parent.removeChild(childNode)
}
