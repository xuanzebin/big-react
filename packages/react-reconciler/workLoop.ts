import { FiberNode } from './fiber'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'

let workInProgress: FiberNode | null = null

function prepareFreshStack(fiber: FiberNode) {
	workInProgress = fiber
}

function renderRoot(root: FiberNode) {
	// 初始化
	prepareFreshStack(root)

	do {
		try {
			workLoop()
			break
		} catch (e) {
			console.warn('workLoop 发生错误', e)
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
