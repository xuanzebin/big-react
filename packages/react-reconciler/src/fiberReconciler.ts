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
import { requestUpdateLane } from './fiberLanes'
import { unstable_ImmediatePriority, unstable_runWithPriority } from 'scheduler'

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
	unstable_runWithPriority(unstable_ImmediatePriority, () => {
		const lane = requestUpdateLane()
		const update = createUpdate(element, lane)
		const hostRootFiber = root.current

		enqueueUpdate(
			hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
			update,
			hostRootFiber,
			lane
		)
		scheduleUpdateOnFiber(hostRootFiber, lane)
	})

	return element
}
