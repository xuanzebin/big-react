import { Action } from 'shared/ReactTypes'
import { Dispatch } from 'react/src/currentDispatcher'
import { isSubsetOfLanes, Lane } from './fiberLanes'

export interface Update<State> {
	action: Action<State>
	next: Update<any> | null
	lane: Lane
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null
	}
	dispatch: null | Dispatch<State>
}

export function createUpdate<State>(
	action: Action<State>,
	lane: Lane
): Update<State> {
	return {
		action,
		lane,
		next: null
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
	update: Update<State>
) {
	const pending = queue.shared.pending

	if (pending === null) {
		update.next = update
	} else {
		update.next = pending.next
		pending.next = update
	}

	queue.shared.pending = update
}

export function processUpdateQueue<State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
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
			const action = pending?.action
			const updateLane = pending?.lane as Lane

			if (!isSubsetOfLanes(renderLane, updateLane)) {
				const clone = createUpdate(pending.action, pending.lane)
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
					const clone = createUpdate(pending.action, pending.lane)
					newBaseQueueLast.next = clone
					newBaseQueueLast = clone
				}
				// 像 ContainerRoot 的 action 是 container 对应的 ReactElement 整棵树
				if (action instanceof Function) {
					newState = action(newState)
				} else {
					newState = action
				}

				pending = pending?.next as Update<State>
			}
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
