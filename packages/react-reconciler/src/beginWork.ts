import { ReactElementType } from 'shared/ReactTypes'

import { FiberNode } from './fiber'
import { renderWithHooks } from './fiberHooks'
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import { mountChildFibers, reconcileChildFibers } from './childFibers'

export const beginWork = (wip: FiberNode) => {
	// 返回子 fiberNode

	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip)
		case Fragment:
			return updateFragment(wip)
		case HostComponent:
			return updateHostComponent(wip)
		case FunctionComponent:
			return updateFunctionComponent(wip)
		case HostText:
			return null
		default:
			if (__DEV__) {
				console.warn('beginWork 未实现的类型')
			}
			break
	}

	return null
}

function updateHostRoot(wip: FiberNode) {
	const baseState = wip.memoizedState
	const updateQueue = wip.updateQueue as UpdateQueue<ReactElementType>
	const pendingUpdate = updateQueue.shared.pending

	updateQueue.shared.pending = null
	const { memoizedState } = processUpdateQueue(baseState, pendingUpdate)

	wip.memoizedState = memoizedState

	const nextChildren = wip.memoizedState

	reconcileChildren(wip, nextChildren)

	return wip.child
}

function updateFragment(wip: FiberNode) {
	const nextChildren = wip.pendingProps

	reconcileChildren(wip, nextChildren)

	return wip.child
}

function updateHostComponent(wip: FiberNode) {
	const nextPorps = wip.pendingProps
	const nextChildren = nextPorps.children

	reconcileChildren(wip, nextChildren)

	return wip.child
}

function updateFunctionComponent(wip: FiberNode) {
	const nextChildren = renderWithHooks(wip)

	reconcileChildren(wip, nextChildren)

	return wip.child
}

function reconcileChildren(wip: FiberNode, nextChildren?: ReactElementType) {
	const current = wip.alternate

	if (current !== null) {
		// update
		wip.child = reconcileChildFibers(wip, current.child, nextChildren)
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, nextChildren)
	}
}
