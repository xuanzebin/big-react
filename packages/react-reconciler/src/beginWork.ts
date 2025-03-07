import { ReactElementType } from 'shared/ReactTypes'

import { FiberNode } from './fiber'
import { renderWithHooks } from './fiberHooks'
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import { mountChildFibers, reconcileChildFibers } from './childFibers'
import { Lane } from './fiberLanes'
import { Ref } from './fiberFlags'
import { pushProvider } from './fiberContext'

export const beginWork = (wip: FiberNode, renderLane: Lane) => {
	// 返回子 fiberNode
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane)
		case Fragment:
			return updateFragment(wip)
		case HostComponent:
			return updateHostComponent(wip)
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane)
		case HostText:
			return null
		case ContextProvider:
			return updateContextProvider(wip)
		default:
			if (__DEV__) {
				console.warn('beginWork 未实现的类型')
			}
			break
	}

	return null
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memorizedState
	const updateQueue = wip.updateQueue as UpdateQueue<ReactElementType>
	const pendingUpdate = updateQueue.shared.pending

	updateQueue.shared.pending = null
	const { memorizedState } = processUpdateQueue(
		baseState,
		pendingUpdate,
		renderLane
	)

	wip.memorizedState = memorizedState

	const nextChildren = wip.memorizedState

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

	markRef(wip.alternate, wip)

	reconcileChildren(wip, nextChildren)

	return wip.child
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(wip, renderLane)

	reconcileChildren(wip, nextChildren)

	return wip.child
}

function updateContextProvider(wip: FiberNode) {
	const newProps = wip.pendingProps
	const providerType = wip.type
	const context = providerType._context

	pushProvider(context, newProps.value)

	const nextChildren = newProps.children
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

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
	const ref = workInProgress.ref

	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref !== ref)
	) {
		workInProgress.flags |= Ref
	}
}
