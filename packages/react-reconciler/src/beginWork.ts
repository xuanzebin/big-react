import { ReactElementType } from 'shared/ReactTypes'

import { createFiberFromFragment, createFiberFromOffscreen, createWorInProgress, FiberNode, OffscreenProps } from './fiber'
import { renderWithHooks } from './fiberHooks'
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
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import { mountChildFibers, reconcileChildFibers } from './childFibers'
import { Lane } from './fiberLanes'
import { ChildDeletion, DidCapture, NoFlags, Placement, Ref } from './fiberFlags'
import { pushProvider } from './fiberContext'
import { pushSuspenseHandler } from './suspenseContext'

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
		case SuspenseComponent:
			return updateSuspenseComponent(wip)
		case OffscreenComponent:
			return updateOffscreenComponent(wip)
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

function updateSuspenseComponent(wip: FiberNode) {
	const current = wip.alternate
	const nextProps = wip.pendingProps

	let showFallback = false
	const didSuspend = (wip.flags & DidCapture) !== NoFlags
	if (didSuspend) {
		wip.flags &= ~DidCapture
		showFallback = true
	}
	const nextPrimaryChildren = nextProps.children
	const nextFallbackChildren = nextProps.fallback
	pushSuspenseHandler(wip)

	if (current === null) {
		if (showFallback) {
			return mountSuspenseFallbackChildren(wip, nextPrimaryChildren, nextFallbackChildren)
		} else {
			return mountSuspensePrimaryChildren(wip, nextPrimaryChildren)
		}
	} else {
		if (showFallback) {
			return updateSuspenseFallbackChildren(wip, nextPrimaryChildren, nextFallbackChildren)
		} else {
			return updateSuspensePrimaryChildren(wip, nextPrimaryChildren)
		}
	}
}

function updateOffscreenComponent(wip: FiberNode) {
	const nextChildren = wip.pendingProps.children

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

function mountSuspenseFallbackChildren(wip: FiberNode, primaryChildren: any, fallbackChildren: any) {
	const primaryChildProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	}
	const primaryChildFragment = createFiberFromOffscreen(primaryChildProps)
	const fallbackChildFragment = createFiberFromFragment(fallbackChildren, null)

	// fallbackChildFragment.flags |= Placement

	primaryChildFragment.return = wip
	fallbackChildFragment.return = wip
	primaryChildFragment.sibling = fallbackChildFragment
	wip.child = primaryChildFragment

	return fallbackChildFragment
}

function mountSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const primaryChildProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	}
	const primaryChildFragment = createFiberFromOffscreen(primaryChildProps)
	primaryChildFragment.return = wip
	wip.child = primaryChildFragment

	return primaryChildFragment
}

function updateSuspenseFallbackChildren(wip: FiberNode, primaryChildren: any, fallbackChildren: any) {
	const current = wip.alternate
	const currentPrimaryChildFragment = current?.child as FiberNode
	const currentFallbackChildFragment = currentPrimaryChildFragment.sibling
	const primaryChildProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	}
	const primaryChildFragment = createWorInProgress(currentPrimaryChildFragment, primaryChildProps)
	let fallbackChildFragment

	if (currentFallbackChildFragment !== null) {
		fallbackChildFragment = createWorInProgress(currentFallbackChildFragment, fallbackChildren)
	} else {
		fallbackChildFragment = createFiberFromFragment(fallbackChildren, null)
		fallbackChildFragment.flags |= Placement
	}

	primaryChildFragment.return = wip
	fallbackChildFragment.return = wip
	primaryChildFragment.sibling = fallbackChildFragment
	wip.child = primaryChildFragment

	return fallbackChildFragment
}

function updateSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const current = wip.alternate
	const currentPrimaryChildFragment = current?.child as FiberNode
	const currentFallbackChildFragment = currentPrimaryChildFragment.sibling
	const primaryChildProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	}
	const primaryChildFragment = createWorInProgress(currentPrimaryChildFragment, primaryChildProps)
	primaryChildFragment.return = wip
	primaryChildFragment.sibling = null
	wip.child = primaryChildFragment
	

	if (currentFallbackChildFragment !== null) {
		const deletions = wip.deletions
		if (deletions === null) {
			wip.deletions = [currentFallbackChildFragment]
			wip.flags |= ChildDeletion
		} else {
			wip.deletions?.push(currentFallbackChildFragment)
		}
	}

	return primaryChildFragment
}
