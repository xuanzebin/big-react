import { FiberNode } from './fiber'
import { Flags, NoFlags, Update } from './fiberFlags'
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags'
import {
	appendInitialChild,
	Container,
	createInstance,
	createTextNodeInstance
} from 'hostConfig'

function markUpdate(wip: FiberNode) {
	wip.flags |= Update
}

export const completeWork = (wip: FiberNode) => {
	// 递归中的归
	const newProps = wip.pendingProps
	const current = wip.alternate

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && current.stateNode !== null) {
				// update
			} else {
				const instance = createInstance(wip.type, newProps)
				appendAllChildren(instance, wip)
				wip.stateNode = instance
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
		case FunctionComponent:
			bubbleProperties(wip)
			return null
		case HostRoot:
			bubbleProperties(wip)
			return null
		default:
			if (__DEV__) {
				console.warn('completeWork 中发现未定义的 tag 类型', wip)
			}
	}

	return null
}

function appendAllChildren(parent: Container, wip: FiberNode) {
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
