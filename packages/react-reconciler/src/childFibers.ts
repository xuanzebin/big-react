import { ReactElementType } from 'shared/ReactTypes'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'

import { HostText } from './workTags'
import { Placement } from './fiberFlags'
import { createFiberFromElement, FiberNode } from './fiber'

function ChildReconciler(shouldTrackEffects: boolean) {
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: ReactElementType
	) {
		const fiber = createFiberFromElement(newChild)

		fiber.return = returnFiber

		return fiber
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: number | string
	) {
		const fiber = new FiberNode(HostText, { content }, null)

		fiber.return = returnFiber

		return fiber
	}

	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffects && fiber.alternate === null) {
			fiber.flags |= Placement
		}

		return fiber
	}

	return function reconcilerChildFiber(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	) {
		if (typeof newChild === 'object' && newChild.$$typeof !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					)
				default:
					if (__DEV__) {
						console.warn('reconcilerChildFiber 未实现的类型', newChild)
					}
					break
			}
		}

		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			)
		}
		if (__DEV__) {
			console.warn('reconcilerChildFiber 未实现的类型', newChild)
		}

		return null
	}
}

export const mountChildFibers = ChildReconciler(false)
export const reconcileChildFibers = ChildReconciler(true)
