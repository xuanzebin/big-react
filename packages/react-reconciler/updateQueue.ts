import { Action } from 'shared/ReactTypes'

export interface Update<State> {
	action: Action<State>
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null
	}
}

export function createUpdate<State>(action: Action<State>): Update<State> {
	return {
		action
	}
}

export function createUpdateQueue<State>(): UpdateQueue<State> {
	const queue: UpdateQueue<State> = {
		shared: {
			pending: null
		}
	}

	return queue
}

export function enqueueUpdate<State>(
	queue: UpdateQueue<State>,
	update: Update<State>
) {
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