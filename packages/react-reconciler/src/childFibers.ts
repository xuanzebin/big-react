import { Props, ReactElementType } from 'shared/ReactTypes'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'

import { HostText } from './workTags'
import { ChildDeletion, Placement } from './fiberFlags'
import { createFiberFromElement, createWorInProgress, FiberNode } from './fiber'

function ChildReconciler(shouldTrackEffects: boolean) {
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
		if (!shouldTrackEffects) return

		if (returnFiber.deletions === null) {
			returnFiber.deletions = [childToDelete]
			returnFiber.flags |= ChildDeletion
		} else {
			returnFiber.deletions.push(childToDelete)
		}
	}

	function deleteRemainingChild(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null
	) {
		if (!shouldTrackEffects) return

		while (currentFirstChild !== null) {
			deleteChild(returnFiber, currentFirstChild)

			currentFirstChild = currentFirstChild.sibling
		}
	}

	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild: ReactElementType
	) {
		const key = newChild.key
		while (currentFiber !== null) {
			// update
			if (currentFiber.key === key) {
				// key 相同
				if (newChild.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === newChild.type) {
						// type 相同
						const existing = useFiber(currentFiber, newChild.props)

						existing.return = returnFiber
						deleteRemainingChild(returnFiber, currentFiber.sibling)

						return existing
					} else {
						deleteRemainingChild(returnFiber, currentFiber)
					}
				} else {
					console.warn('还未实现的 react 类型', newChild)
					break
				}
			} else {
				deleteChild(returnFiber, currentFiber)
				currentFiber = currentFiber.sibling
			}
		}

		const fiber = createFiberFromElement(newChild)

		fiber.return = returnFiber

		return fiber
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: number | string
	) {
		while (currentFiber !== null) {
			// update
			if (currentFiber.tag === HostText) {
				const existing = useFiber(currentFiber, { content })

				existing.return = returnFiber
				deleteRemainingChild(returnFiber, currentFiber.sibling)

				return existing
			}

			deleteChild(returnFiber, currentFiber)
			currentFiber = currentFiber.sibling
		}

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

		if (currentFiber !== null) {
			deleteChild(returnFiber, currentFiber)
		}

		if (__DEV__) {
			console.warn('reconcilerChildFiber 未实现的类型', newChild)
		}

		return null
	}
}

function useFiber(fiber: FiberNode, pendingProps: Props) {
	const clone = createWorInProgress(fiber, pendingProps)

	clone.index = 0
	clone.sibling = null

	return clone
}

export const mountChildFibers = ChildReconciler(false)
export const reconcileChildFibers = ChildReconciler(true)
