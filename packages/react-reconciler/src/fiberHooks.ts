import internals from 'shared/internals'
import { Action } from 'shared/ReactTypes'
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'

import {
	UpdateQueue,
	createUpdate,
	enqueueUpdate,
	createUpdateQueue,
	processUpdateQueue
} from './updateQueue'
import { FiberNode } from './fiber'
import { scheduleUpdateOnFiber } from './workLoop'

export interface Hook {
	memorizedState: any
	updateQueue: unknown
	next: Hook | null
}

let currentHook: Hook | null = null
let workInProgressHook: Hook | null = null
let currentlyRenderingFiber: FiberNode | null = null

const { currentDispatcher } = internals

export function renderWithHooks(wip: FiberNode) {
	currentlyRenderingFiber = wip
	wip.memoizedState = null

	const current = wip.alternate

	if (current) {
		// update
		currentDispatcher.current = HooksDispatcherOnUpdate
	} else {
		// mount
		currentDispatcher.current = HooksDispatcherOnMount
	}

	const Component = wip.type
	const props = wip.pendingProps
	const children = Component(props)

	currentHook = null
	workInProgressHook = null
	currentlyRenderingFiber = null

	return children
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
}

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
}

function updateState<State>(): [State, Dispatch<State>] {
	const hook = updateWorkInProgressHook()

	const queue = hook.updateQueue as UpdateQueue<State>
	const pending = queue.shared.pending

	const { memoizedState } = processUpdateQueue(hook.memorizedState, pending)

	return [memoizedState, queue.dispatch as Dispatch<State>]
}

function mountState<State>(
	initialState: () => State | State
): [State, Dispatch<State>] {
	const hook = mountWorkInProgressHook()

	let memoizedState
	if (typeof initialState === 'function') {
		memoizedState = initialState()
	} else {
		memoizedState = initialState
	}

	const queue = createUpdateQueue<State>()
	hook.updateQueue = queue
	hook.memorizedState = memoizedState

	// @ts-ignore
	const dispatch = dispatchSetState.bind(
		null,
		currentlyRenderingFiber,
		hook.updateQueue
	)
	queue.dispatch = dispatch

	return [memoizedState, dispatch]
}

function dispatchSetState<State>(
	fiber: FiberNode,
	queue: UpdateQueue<State>,
	action: Action<State>
) {
	const update = createUpdate(action)
	enqueueUpdate(queue, update)
	scheduleUpdateOnFiber(fiber)
}

function updateWorkInProgressHook() {
	let nextCurrentHook: Hook | null

	// update 阶段首个 hook
	if (currentHook === null) {
		const current = currentlyRenderingFiber?.alternate
		if (current !== null) {
			nextCurrentHook = (current as FiberNode).memoizedState
		} else {
			nextCurrentHook = null
		}
	} else {
		nextCurrentHook = currentHook.next
	}

	if (nextCurrentHook === null) {
		throw new Error(
			`组件 ${currentlyRenderingFiber?.type} 本次执行的 hook 比上次一次要多`
		)
	}

	currentHook = nextCurrentHook
	const nextHook: Hook = {
		memorizedState: currentHook?.memorizedState,
		updateQueue: currentHook?.updateQueue,
		next: null
	}
	if (workInProgressHook === null) {
		if (currentlyRenderingFiber === null) {
			throw new Error('hooks 只能在函数组件中使用')
		} else {
			workInProgressHook = nextHook
			currentlyRenderingFiber.memoizedState = nextHook
		}
	} else {
		workInProgressHook.next = nextHook
		workInProgressHook = nextHook
	}

	return nextHook
}

function mountWorkInProgressHook() {
	const hook: Hook = {
		memorizedState: null,
		updateQueue: null,
		next: null
	}

	if (workInProgressHook === null) {
		if (currentlyRenderingFiber === null) {
			throw new Error('hooks 只能在函数组件中使用')
		} else {
			workInProgressHook = hook
			currentlyRenderingFiber.memoizedState = hook
		}
	} else {
		workInProgressHook.next = hook
		workInProgressHook = hook
	}

	return hook
}
