import { ReactElementType } from 'shared/ReactTypes'

import { createFiberFromFragment, createFiberFromOffscreen, createWorInProgress, FiberNode, OffscreenProps } from './fiber'
import { bailoutHooks, renderWithHooks } from './fiberHooks'
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	MemoComponent,
	OffscreenComponent,
	SuspenseComponent
} from './workTags'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import { cloneChildFibers, mountChildFibers, reconcileChildFibers } from './childFibers'
import { includesSomeLanes, Lane, NoLane, NoLanes } from './fiberLanes'
import { ChildDeletion, DidCapture, NoFlags, Placement, Ref } from './fiberFlags'
import { prepareToReadContext, propagateContextChange, pushProvider } from './fiberContext'
import { pushSuspenseHandler } from './suspenseContext'
import { shallowEqual } from 'shared/shallowEquals'

let didReceiveUpdate = false

export function markWipReceivedUpdate() {
	didReceiveUpdate = true
}

export const beginWork = (wip: FiberNode, renderLane: Lane) => {
	didReceiveUpdate = false

	const current = wip.alternate
	if (current !== null) {
		const oldProps = current.memoizedProps
		const newProps = wip.pendingProps

		if (oldProps !== newProps || current.type !== wip.type) {
			didReceiveUpdate = true
		} else {
			const hasScheduledStateUpdateOrContext = checkScheduledStateUpdateOrContext(current, renderLane)
			if (!hasScheduledStateUpdateOrContext) {
				// 命中 bailout
				didReceiveUpdate = false

				switch (wip.tag) {
					case ContextProvider:
						const newValue = wip.memoizedProps.value
						const context = wip.type._context
						pushProvider(context, newValue)
						break;
					// TODO SuspenseComponent
					default:
						break;
				}
				
				return bailoutOnAlreadyFinishedWork(wip, renderLane)
			}
		}
	}

	wip.lanes = NoLanes
	// 返回子 fiberNode
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane)
		case Fragment:
			return updateFragment(wip)
		case HostComponent:
			return updateHostComponent(wip)
		case FunctionComponent:
			return updateFunctionComponent(wip, wip.type, renderLane)
		case HostText:
			return null
		case ContextProvider:
			return updateContextProvider(wip, renderLane)
		case SuspenseComponent:
			return updateSuspenseComponent(wip)
		case OffscreenComponent:
			return updateOffscreenComponent(wip)
		case MemoComponent:
			return updateMemoComponent(wip, renderLane)
		default:
			if (__DEV__) {
				console.warn('beginWork 未实现的类型')
			}
			break
	}

	return null
}

function checkScheduledStateUpdateOrContext(current: FiberNode, renderLane: Lane) {
	const updateLane = current.lanes

	if (includesSomeLanes(updateLane, renderLane)) {
		return true
	}

	return false
}

function bailoutOnAlreadyFinishedWork(wip: FiberNode, renderLane: Lane) {
	if (!includesSomeLanes(wip.childLanes, renderLane)) {
		if (__DEV__) {
			console.warn('bailout 整颗子树，根节点是 ', wip)
		}
		return null
	}

	if (__DEV__) {
		console.warn('bailout 单个 fiber ', wip)
	}

	cloneChildFibers(wip)

	return wip.child
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memorizedState
	const updateQueue = wip.updateQueue as UpdateQueue<ReactElementType>
	const pendingUpdate = updateQueue.shared.pending

	const prevChildren = wip.memorizedState
		
	updateQueue.shared.pending = null
	const { memorizedState } = processUpdateQueue(
		baseState,
		pendingUpdate,
		renderLane
	)

	wip.memorizedState = memorizedState

	const current = wip.alternate
	if (current !== null) {
		if (!current.memorizedState) {
			current.memorizedState = memorizedState
		}
	}

	const nextChildren = wip.memorizedState
	if (prevChildren === nextChildren) {
		return bailoutOnAlreadyFinishedWork(wip, renderLane)
	}

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

function updateFunctionComponent(wip: FiberNode, Component: FiberNode['type'], renderLane: Lane) {
	prepareToReadContext(wip, renderLane)
	
	const nextChildren = renderWithHooks(wip, Component, renderLane)

	const current = wip.alternate

	if (current !== null && !didReceiveUpdate) {
		bailoutHooks(wip, renderLane)
		return bailoutOnAlreadyFinishedWork(wip, renderLane)
	}

	reconcileChildren(wip, nextChildren)

	return wip.child
}

function updateContextProvider(wip: FiberNode, renderLane: Lane) {
	const providerType = wip.type
	const context = providerType._context
	const newProps = wip.pendingProps
	const oldProps = wip.memoizedProps
	const newValue = newProps.value

	pushProvider(context, newProps.value)

	if (oldProps !== null) {
		const oldValue = oldProps.value

		if (Object.is(oldValue, newValue) && oldProps.children === newProps.children) {
			return bailoutOnAlreadyFinishedWork(wip, renderLane)
		} else {
			propagateContextChange(wip, context, renderLane)
		}
	}

	const nextChildren = newProps.children
	reconcileChildren(wip, nextChildren)

	return wip.child
}

function updateMemoComponent(wip: FiberNode, renderLane: Lane) {
	const current = wip.alternate
	const nextProps = wip.pendingProps
	const Component = wip.type.type

	if (current !== null) {
		const prevProps = current.memoizedProps


		if (shallowEqual(prevProps, nextProps) && current.ref === wip.ref) {
			didReceiveUpdate = false
			wip.pendingProps = prevProps

			if (!checkScheduledStateUpdateOrContext(current, renderLane)) {
				wip.lanes = current.lanes
				return bailoutOnAlreadyFinishedWork(wip, renderLane)
			}
		}
	}

	return updateFunctionComponent(wip, Component, renderLane)
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
