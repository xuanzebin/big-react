import { Action } from 'shared/ReactTypes'
import { Dispatch } from 'react/src/currentDispatcher'
import { Lane } from './fiberLanes'

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
): { memorizedState: State } {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memorizedState: baseState
	}

	if (pendingUpdate !== null) {
		const first = pendingUpdate.next
		let pending = pendingUpdate.next

		do {
			const action = pending?.action
			const updateLane = pending?.lane

			if (updateLane === renderLane) {
				if (action instanceof Function) {
					console.log(baseState, action(baseState))
					baseState = action(baseState)
				} else {
					baseState = action
				}

				pending = pending?.next as Update<State>
			} else {
				if (__DEV__) {
					console.error('暂时不应该进入这里，因为目前的更新应该都是同步更新')
				}
			}
		} while (pending !== first)
	}

	result.memorizedState = baseState

	return result
}
