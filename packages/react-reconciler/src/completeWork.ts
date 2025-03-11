import { FiberNode } from './fiber'
import { popProvider } from './fiberContext'
import { Flags, NoFlags, Ref, Update, Visibility } from './fiberFlags'
import { popSuspenseHandler } from './suspenseContext'
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	OffscreenComponent,
	SuspenseComponent
} from './workTags'
import {
	appendInitialChild,
	Container,
	createInstance,
	createTextNodeInstance,
	Instance
} from 'hostConfig'

function markUpdate(wip: FiberNode) {
	wip.flags |= Update
}

function markRef(workInProgress: FiberNode) {
	workInProgress.flags |= Ref
}

export const completeWork = (wip: FiberNode) => {
	// 递归中的归
	const newProps = wip.pendingProps
	const current = wip.alternate

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && current.stateNode !== null) {
				// update
				markUpdate(wip)
				if (current.ref !== wip.ref) {
					markRef(wip)
				}
			} else {
				const instance = createInstance(wip.type, newProps)
				appendAllChildren(instance, wip)
				wip.stateNode = instance
				if (wip.ref !== null) {
					markRef(wip)
				}
			}
			bubbleProperties(wip)
			return null
		case HostText:
			if (current !== null && current.stateNode !== null) {
				// update
				const oldText = current.memoizedProps.content
				const newText = newProps?.content

				if (oldText !== newText) {
					markUpdate(wip)
				}
			} else {
				const instance = createTextNodeInstance(newProps?.content)
				wip.stateNode = instance
			}
			bubbleProperties(wip)
			return null
		case HostRoot:
		case Fragment:
		case OffscreenComponent:
		case FunctionComponent:
			bubbleProperties(wip)
			return null
		case ContextProvider:
			popProvider(wip.type._context)
			bubbleProperties(wip)
			return null
		case SuspenseComponent:
			popSuspenseHandler()
			const offscreenFiber = wip.child as FiberNode
			const isHidden = offscreenFiber.pendingProps.mode === 'hidden'
			const currentOffscreenFiber = offscreenFiber.alternate

			if (currentOffscreenFiber !== null) {
				const wasHidden = currentOffscreenFiber.pendingProps.mode === 'hidden'
				if (isHidden !== wasHidden) {
					offscreenFiber.flags |= Visibility
					bubbleProperties(offscreenFiber)
				}
			} else if (isHidden) {
				offscreenFiber.flags |= Visibility
				bubbleProperties(offscreenFiber)
			}
			bubbleProperties(wip)
			return null
		default:
			if (__DEV__) {
				console.warn('completeWork 中发现未定义的 tag 类型', wip)
			}
	}

	return null
}

function appendAllChildren(parent: Container | Instance, wip: FiberNode) {
	let node = wip.child

	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(node?.stateNode, parent)
		} else if (node.child !== null) {
			node.child.return = node
			node = node.child

			continue
		}

		if (node === wip) {
			return
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return
			}

			node = node?.return
		}

		node.sibling.return = node.return
		node = node.sibling
	}
}

function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags
	let child = wip.child

	while (child !== null) {
		subtreeFlags |= child.subtreeFlags
		subtreeFlags |= child.flags

		child.return = wip
		child = child.sibling
	}

	wip.subtreeFlags = subtreeFlags as Flags
}
