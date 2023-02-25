import { createWorInProgress, FiberNode, FiberRootNode } from './fiber'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { HostRoot } from './workTags'

let workInProgress: FiberNode | null = null

function prepareFreshStack(root: FiberRootNode) {
	workInProgress = createWorInProgress(root.current, {})
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	const root = markUpdateFromFiberToRoot(fiber)

	renderRoot(root)
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber
	let parent = node.return

	while (parent !== null) {
		node = parent
		parent = node.return
	}

	if (node.tag === HostRoot) {
		return node.stateNode
	}

	return null
}

function renderRoot(root: FiberRootNode) {
	// 初始化
	prepareFreshStack(root)

	do {
		try {
			workLoop()
			break
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop 发生错误', e)
			}
			workInProgress = null
		}
	} while (true)
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress)
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber)

	fiber.memoizedProps = fiber.pendingProps

	if (next !== null) {
		workInProgress = next
	} else {
		completeUnitOfWork(fiber)
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber

	do {
		completeWork(fiber)

		if (node.sibling !== null) {
			workInProgress = node.sibling
			return
		}

		node = node.return
		workInProgress = node
	} while (node !== null)
}
