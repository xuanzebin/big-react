export type syncCallback = (...args: any) => void

let isFlushSyncScheduled = false
// TODO: 需要清理已经执行的 callback
let syncQueue: ((...args: any) => void)[] | null = null

export function scheduleSyncCallback(callback: syncCallback) {
	if (syncQueue === null) {
		syncQueue = [callback]
	} else {
		syncQueue.push(callback)
	}
}

export function flushSyncCallbackQueue() {
	if (!isFlushSyncScheduled && syncQueue) {
		isFlushSyncScheduled = true

		try {
			syncQueue.forEach((callback) => callback())
		} catch (e) {
			if (__DEV__) {
				console.error('flushSyncCallbackQueue 调度失败', e)
			}
		} finally {
			isFlushSyncScheduled = false
		}
	}
}
