import { Action } from 'shared/ReactTypes'
import { Dispatch } from 'react/src/currentDispatcher'

export interface Update<State> {
	action: Action<State>
	next: Update<any> | null
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null
	}
	dispatch: null | Dispatch<State>
}

export function createUpdate<State>(action: Action<State>): Update<State> {
	return {
		action,
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
	pendingUpdate: Update<State> | null
): { memoizedState: State } {
	let result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	}

	if (pendingUpdate !== null) {
		const action = pendingUpdate.action

		if (action instanceof Function) {
			result = { memoizedState: action(baseState) }
		} else {
			result = { memoizedState: action }
		}
	}

	return result
}
