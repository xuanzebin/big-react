import { Props, ReactElementType, Key } from 'shared/ReactTypes'
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols'

import { Fragment, HostText } from './workTags'
import { ChildDeletion, Placement } from './fiberFlags'
import {
	createFiberFromElement,
	createFiberFromFragment,
	createWorInProgress,
	FiberNode
} from './fiber'

type ExistingChildren = Map<string | number, FiberNode>

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
						let props = newChild.props

						if (newChild.type === REACT_FRAGMENT_TYPE) {
							props = newChild.props.children
						}
						// type 相同
						const existing = useFiber(currentFiber, props)

						existing.return = returnFiber
						deleteRemainingChild(returnFiber, currentFiber.sibling)

						return existing
					} else {
						deleteRemainingChild(returnFiber, currentFiber)
						break
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

		let fiber

		if (newChild.type === REACT_FRAGMENT_TYPE) {
			fiber = createFiberFromFragment(newChild.props.children, key)
		} else {
			fiber = createFiberFromElement(newChild)
		}

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

	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		newChild: any[]
	) {
		let lastPlacedIndex = 0
		let lastNewFiber: FiberNode | null = null
		let firstNewFiber: FiberNode | null = null
		let current: FiberNode | null = currentFirstChild

		const existingChildren: ExistingChildren = new Map()

		while (current !== null) {
			const keyToUse = current.key !== null ? current.key : current.index

			existingChildren.set(keyToUse, current)

			current = current.sibling
		}

		for (let i = 0; i < newChild.length; i++) {
			const after = newChild[i]

			const newFiber = updateFromMap(returnFiber, existingChildren, i, after)

			if (newFiber === null) {
				continue
			}

			newFiber.index = i
			newFiber.return = returnFiber

			if (lastNewFiber === null) {
				lastNewFiber = newFiber
				firstNewFiber = newFiber
			} else {
				lastNewFiber.sibling = newFiber
				lastNewFiber = lastNewFiber.sibling
			}

			if (!shouldTrackEffects) continue

			const current = newFiber.alternate
			if (current !== null) {
				const oldIndex = current.index
				if (oldIndex < lastPlacedIndex) {
					newFiber.flags |= Placement
				} else {
					lastPlacedIndex = oldIndex
				}
			} else {
				newFiber.flags |= Placement
			}
		}

		existingChildren.forEach((fiber) => {
			deleteChild(returnFiber, fiber)
		})

		return firstNewFiber
	}

	function getElementKeyToUse(element: any, index?: number): Key {
		if (
			Array.isArray(element) ||
			typeof element === 'string' ||
			typeof element === 'number' ||
			element === undefined ||
			element === null
		) {
			return index
		}
		return element.key !== null ? element.key : index
	}

	function updateFromMap(
		returnFiber: FiberNode,
		existingChild: ExistingChildren,
		index: number,
		element: any
	) {
		const keyToUse = getElementKeyToUse(element, index)
		const before = existingChild.get(keyToUse)

		if (typeof element === 'string' || typeof element === 'number') {
			if (before && before.tag === HostText) {
				existingChild.delete(keyToUse)
				return useFiber(before, { content: element + '' })
			}

			return new FiberNode(HostText, { content: element + '' }, null)
		}

		if (typeof element === 'object' && element !== null) {
			switch (element.$$typeof) {
				case REACT_ELEMENT_TYPE: {
					if (element.type === REACT_FRAGMENT_TYPE) {
						return updateFragment(
							returnFiber,
							before,
							element,
							keyToUse,
							existingChild
						)
					}

					if (before && before.type === element.type) {
						existingChild.delete(keyToUse)
						return useFiber(before, element.props)
					}

					return createFiberFromElement(element)
				}
			}

			if (Array.isArray(element)) {
				return updateFragment(
					returnFiber,
					before,
					element,
					keyToUse,
					existingChild
				)
			}
		}

		return null
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
		newChild?: any
	) {
		const isUnkeyTopLevelFragment =
			typeof newChild === 'object' &&
			newChild !== null &&
			newChild.type === REACT_FRAGMENT_TYPE &&
			newChild.key === null

		if (isUnkeyTopLevelFragment) {
			newChild = newChild.props.children
		}

		if (typeof newChild === 'object' && newChild !== null) {
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFiber, newChild)
			}

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
			deleteRemainingChild(returnFiber, currentFiber)
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

function updateFragment(
	returnFiber: FiberNode,
	current: FiberNode | undefined,
	elements: any[],
	key: Key,
	existingChildren: ExistingChildren
) {
	let fiber

	if (!current || current.tag !== Fragment) {
		fiber = new FiberNode(Fragment, elements, key)
	} else {
		existingChildren.delete(key)
		fiber = useFiber(current, elements)
	}

	fiber.return = returnFiber

	return fiber
}

export const mountChildFibers = ChildReconciler(false)
export const reconcileChildFibers = ChildReconciler(true)
