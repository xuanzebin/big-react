import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import internals from 'shared/internals'
import { Action } from 'shared/ReactTypes'
import { FiberNode } from './fiber'
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue
} from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'

export interface Hook {
	memorizedState: any
	updateQueue: unknown
	next: Hook | null
}

let workInProgressHook: Hook | null = null
let currentlyRenderingFiber: FiberNode | null = null

const { currentDispatcher } = internals

export function renderWithHooks(wip: FiberNode) {
	currentlyRenderingFiber = wip
	wip.memoizedState = null

	const current = wip.alternate

	if (current) {
		// update
	} else {
		// mount
		currentDispatcher.current = HooksDispatcherOnMount
	}

	const Component = wip.type
	const props = wip.pendingProps
	const children = Component(props)

	currentlyRenderingFiber = null

	return children
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
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
