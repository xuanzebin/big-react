import { Container } from 'hostConfig'

import {
	UpdateQueue,
	createUpdate,
	enqueueUpdate,
	createUpdateQueue
} from './updateQueue'
import { HostRoot } from './workTags'
import { FiberNode, FiberRootNode } from './fiber'
import { scheduleUpdateOnFiber } from './workLoop'
import { ReactElementType } from 'shared/ReactTypes'

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null)
	const fiberRootNode = new FiberRootNode(container, hostRootFiber)

	hostRootFiber.updateQueue = createUpdateQueue()

	return fiberRootNode
}

export function updateContainer(
	element: ReactElementType | null,
	root: FiberRootNode
) {
	const update = createUpdate(element)
	const hostRootFiber = root.current

	enqueueUpdate(
		hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
		update
	)

	scheduleUpdateOnFiber(hostRootFiber)

	return element
}
