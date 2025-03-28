import { Action } from 'shared/ReactTypes'
import { Dispatch } from 'react/src/currentDispatcher'
import { isSubsetOfLanes, Lane, Lanes, mergeLanes, NoLane } from './fiberLanes'
import { FiberNode } from './fiber'

export interface Update<State> {
	action: Action<State>
	next: Update<any> | null
	lane: Lane
	hasEagerState?: boolean
	eagerState?: State | null
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null
	}
	dispatch: null | Dispatch<State>
}

export function createUpdate<State>(
	action: Action<State>,
	lane: Lane,
	hasEagerState = false,
	eagerState = null
): Update<State> {
	return {
		action,
		lane,
		next: null,
		hasEagerState,
		eagerState
	}
}

export function createUpdateQueue<State>(): UpdateQueue<State> {
	const queue: UpdateQueue<State> = {
		shared: {
			pending: null
		},
		dispatch: null
	}

	return queue
}

export function enqueueUpdate<State>(
	queue: UpdateQueue<State>,
	update: Update<State>,
	fiber: FiberNode,
	lane: Lane
) {
	const pending = queue.shared.pending

	if (pending === null) {
		update.next = update
	} else {
		update.next = pending.next
		pending.next = update
	}

	queue.shared.pending = update
	fiber.lanes = mergeLanes(fiber.lanes, lane)

	const alternate = fiber.alternate
	if (alternate !== null) {
		alternate.lanes = mergeLanes(alternate.lanes, lane)
	}
}

export function basicStateReducer<State>(state: State, action: Action<State>): State {
	if (action instanceof Function) {
		return action(state)
	} else {
		return action
	}
}

export function processUpdateQueue<State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane,
	onSkipUpdate?: <State>(update: Update<State>) => void 
): {
	baseState: State
	memorizedState: State
	baseQueue: Update<State> | null
} {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		baseState,
		baseQueue: null,
		memorizedState: baseState
	}

	if (pendingUpdate !== null) {
		const first = pendingUpdate.next
		let pending = pendingUpdate.next as Update<any>

		let newBaseState = baseState
		let newState = baseState
		let newBaseQueueFirst: Update<State> | null = null
		let newBaseQueueLast: Update<State> | null = null

		do {
			const updateLane = pending?.lane as Lane

			if (!isSubsetOfLanes(renderLane, updateLane)) {
				const clone = createUpdate(pending.action, pending.lane)

				onSkipUpdate?.(clone)

				if (newBaseQueueFirst === null) {
					newBaseQueueFirst = clone
					newBaseQueueLast = clone
					newBaseState = newState
				} else {
					;(newBaseQueueLast as Update<State>).next = clone
					newBaseQueueLast = clone
				}
			} else {
				if (newBaseQueueLast !== null) {
					const clone = createUpdate(pending.action, NoLane)
					newBaseQueueLast.next = clone
					newBaseQueueLast = clone
				}
				const action = pending?.action
				if (pending.hasEagerState) {
					newState = pending.eagerState
				} else {
					newState = basicStateReducer(newState, action)
				}
			}

			pending = pending?.next as Update<State>
		} while (pending !== first)

		if (newBaseQueueLast === null) {
			newBaseState = newState
		} else {
			newBaseQueueLast.next = newBaseQueueFirst
		}

		result.memorizedState = newState
		result.baseQueue = newBaseQueueLast
		result.baseState = newBaseState
	}

	return result
}
