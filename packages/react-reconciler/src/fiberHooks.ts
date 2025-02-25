import internals from 'shared/internals'
import { Action } from 'shared/ReactTypes'
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'

import {
	UpdateQueue,
	createUpdate,
	enqueueUpdate,
	createUpdateQueue,
	processUpdateQueue,
	Update
} from './updateQueue'
import { FiberNode } from './fiber'
import { scheduleUpdateOnFiber } from './workLoop'
import { Lane, NoLane, requestUpdateLane } from './fiberLanes'
import { Flags, PassiveEffect } from './fiberFlags'
import { HookHasEffect, Passive } from './hooksEffectTags'
import ReactCurrentBatchConfig from 'react/src/currentBatchConfig'

export interface Hook {
	memorizedState: any
	updateQueue: unknown
	baseState: any
	baseQueue: Update<any> | null
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
	wip.updateQueue = null

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
	useEffect: mountEffect,
	useTransition: mountTransition
}

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect,
	useTransition: updateTransition
}

function startTransition(
	setPending: Dispatch<boolean>,
	callback: () => void
): void {
	setPending(true)

	const previousTransition = ReactCurrentBatchConfig.transition
	ReactCurrentBatchConfig.transition = 1

	callback()
	setPending(false)

	ReactCurrentBatchConfig.transition = previousTransition
}

function mountTransition(): [boolean, (callback: () => void) => void] {
	const [isPending, dispatch] = mountState(false)
	const hook = mountWorkInProgressHook()
	const startTransitionFn = startTransition.bind(null, dispatch)
	hook.memorizedState = startTransitionFn

	return [isPending, startTransitionFn]
}

function updateTransition(): [boolean, (callback: () => void) => void] {
	const [isPending] = updateState<boolean>()
	const hook = updateWorkInProgressHook()
	const startTransitionFn = hook.memorizedState

	return [isPending, startTransitionFn]
}

function mountState<State>(
	initialState: (() => State) | State
): [State, Dispatch<State>] {
	const hook = mountWorkInProgressHook()

	let memorizedState
	if (typeof initialState === 'function') {
		memorizedState = (initialState as () => State)()
	} else {
		memorizedState = initialState
	}

	const queue = createUpdateQueue<State>()
	hook.updateQueue = queue
	hook.baseState = memorizedState
	hook.memorizedState = memorizedState

	// @ts-ignore
	const dispatch = dispatchSetState.bind(
		null,
		currentlyRenderingFiber,
		hook.updateQueue as UpdateQueue<unknown>
	)
	queue.dispatch = dispatch

	return [memorizedState, dispatch]
}

function updateState<State>(): [State, Dispatch<State>] {
	const hook = updateWorkInProgressHook()
	const queue = hook.updateQueue as UpdateQueue<State>
	const pending = queue.shared.pending

	const current = currentHook as Hook
	let baseQueue = current.baseQueue
	const baseState = hook.baseState

	if (pending !== null) {
		if (baseQueue !== null) {
			const pendingFirst = pending.next
			const baseFirst = baseQueue.next
			pending.next = baseFirst
			baseQueue.next = pendingFirst
		}
		baseQueue = pending
		current.baseQueue = baseQueue
		queue.shared.pending = null
	}

	if (baseQueue !== null) {
		const {
			memorizedState,
			baseState: newBaseState,
			baseQueue: newBaseQueue
		} = processUpdateQueue(baseState, baseQueue, workInProgressLane)

		hook.memorizedState = memorizedState
		hook.baseState = newBaseState
		hook.baseQueue = newBaseQueue
	}

	return [hook.memorizedState, queue.dispatch as Dispatch<State>]
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = mountWorkInProgressHook()
	const nextDeps = deps === undefined ? null : deps

	;(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect

	hook.memorizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	)
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = updateWorkInProgressHook()
	const nextDeps = deps === undefined ? null : deps
	let destroy: EffectCallback | void

	if (currentHook !== null) {
		const prevEffect = currentHook.memorizedState as Effect
		destroy = prevEffect.destroy

		if (nextDeps !== null) {
			const prevDeps = prevEffect.deps

			if (areHookInputsEqual(nextDeps, prevDeps)) {
				hook.memorizedState = pushEffect(Passive, create, destroy, nextDeps)
				return
			}

			;(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect

			hook.memorizedState = pushEffect(
				Passive | HookHasEffect,
				create,
				destroy,
				nextDeps
			)
		}
	}
}

function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
	if (nextDeps === null || prevDeps === null) return false

	for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
		if (Object.is(nextDeps[i], prevDeps[i])) {
			continue
		}

		return false
	}

	return true
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
	fiber: FiberNode | null,
	queue: UpdateQueue<State>,
	action: Action<State>
) {
	if (fiber === null) return

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
		next: null,
		baseState: currentHook?.baseState,
		baseQueue: currentHook?.baseQueue
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
		next: null,
		baseState: null,
		baseQueue: null
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
