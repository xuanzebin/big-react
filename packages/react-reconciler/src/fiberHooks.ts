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
import { Lane, NoLane, requestUpdateLane } from './fiberLanes'
import { Flags, PassiveEfeect } from './fiberFlags'
import { HookHasEffect, Passive } from './hooksEffectTags'

export interface Hook {
	memorizedState: any
	updateQueue: unknown
	next: Hook | null
}

export interface Effect {
	tag: Flags
	create: EffectCallback | void
	destroy: EffectCallback | void
	deps: EffectDeps
	next: Effect | null
}

type EffectCallback = () => void
type EffectDeps = any[] | null

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null
}

let currentHook: Hook | null = null
let workInProgressLane: Lane = NoLane
let workInProgressHook: Hook | null = null
let currentlyRenderingFiber: FiberNode | null = null

const { currentDispatcher } = internals

export function renderWithHooks(wip: FiberNode, renderLane: Lane) {
	currentlyRenderingFiber = wip
	workInProgressLane = renderLane
	wip.memorizedState = null

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
	workInProgressLane = NoLane

	return children
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect
}

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect
}

function mountState<State>(
	initialState: () => State | State
): [State, Dispatch<State>] {
	const hook = mountWorkInProgressHook()

	let memorizedState
	if (typeof initialState === 'function') {
		memorizedState = initialState()
	} else {
		memorizedState = initialState
	}

	const queue = createUpdateQueue<State>()
	hook.updateQueue = queue
	hook.memorizedState = memorizedState

	// @ts-ignore
	const dispatch = dispatchSetState.bind(
		null,
		currentlyRenderingFiber,
		hook.updateQueue
	)
	queue.dispatch = dispatch

	return [memorizedState, dispatch]
}

function updateState<State>(): [State, Dispatch<State>] {
	const hook = updateWorkInProgressHook()
	const queue = hook.updateQueue as UpdateQueue<State>
	const pending = queue.shared.pending

	queue.shared.pending = null

	if (pending !== null) {
		const { memorizedState } = processUpdateQueue(
			hook.memorizedState,
			pending,
			workInProgressLane
		)

		hook.memorizedState = memorizedState
	}

	return [hook.memorizedState, queue.dispatch as Dispatch<State>]
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = updateWorkInProgressHook()
	const nextDeps = deps === undefined ? null : deps

	;(currentlyRenderingFiber as FiberNode).flags |= PassiveEfeect

	hook.memorizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	)
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	// empty
}

function pushEffect(
	hookFlags: Flags,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: EffectDeps
): Effect {
	const effect: Effect = {
		tag: hookFlags,
		create,
		destroy,
		deps,
		next: null
	}
	const fiber = currentlyRenderingFiber as FiberNode
	let updateQueue = fiber.updateQueue as FCUpdateQueue<any>

	if (!updateQueue) {
		updateQueue = createFCUpdateQueue()
		fiber.updateQueue = updateQueue
		effect.next = effect
		updateQueue.lastEffect = effect
	} else {
		const lastEffect = updateQueue.lastEffect

		if (!lastEffect) {
			effect.next = effect
			updateQueue.lastEffect = effect
		} else {
			const firstEffect = lastEffect.next

			effect.next = firstEffect
			lastEffect.next = effect
			updateQueue.lastEffect = effect
		}
	}

	return effect
}

function createFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>

	updateQueue.lastEffect = null

	return updateQueue
}

function dispatchSetState<State>(
	fiber: FiberNode,
	queue: UpdateQueue<State>,
	action: Action<State>
) {
	const lane = requestUpdateLane()
	const update = createUpdate(action, lane)

	enqueueUpdate(queue, update)
	scheduleUpdateOnFiber(fiber, lane)
}

function updateWorkInProgressHook() {
	let nextCurrentHook: Hook | null

	// update 阶段首个 hook
	if (currentHook === null) {
		const current = currentlyRenderingFiber?.alternate
		if (current !== null) {
			nextCurrentHook = (current as FiberNode).memorizedState
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
			currentlyRenderingFiber.memorizedState = nextHook
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
			currentlyRenderingFiber.memorizedState = hook
		}
	} else {
		workInProgressHook.next = hook
		workInProgressHook = hook
	}

	return hook
}
