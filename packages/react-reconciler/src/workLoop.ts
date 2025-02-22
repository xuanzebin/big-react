import {
	createWorInProgress,
	FiberNode,
	FiberRootNode,
	PengdingPssiveEffects
} from './fiber'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { HostRoot } from './workTags'
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './commitWork'
import { MutationMask, NoFlags, PassiveEffect, PassiveMask } from './fiberFlags'
import {
	getHighestPriorityLane,
	Lane,
	lanesToSchedulerPriority,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes'
import { flushSyncCallbackQueue, scheduleSyncCallback } from './syncTaskQueue'
import { scheduleMicroTask } from 'hostConfig'
import {
	unstable_NormalPriority as normalPriority,
	unstable_scheduleCallback as scheduleCallback,
	unstable_cancelCallback,
	unstable_shouldYield
} from 'scheduler'
import { HookHasEffect, Passive } from './hooksEffectTags'

type RootExitStatus = number
const RootInComplete: RootExitStatus = 1
const RootCompleted: RootExitStatus = 2
// TODO: 还有一种情况，执行报错待补充

let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
let rootDoesHavePassiveEffects = false

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishedLane = NoLane
	root.finishedWork = null
	workInProgress = createWorInProgress(root.current, {})
	wipRootRenderLane = lane
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFromFiberToRoot(fiber)

	markRootUpdated(root, lane)
	ensureRootIsScheduled(root)
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

function flushPassiveEffect(pendingPassiveEffects: PengdingPssiveEffects) {
	let didFlushPassiveEffects = false
	pendingPassiveEffects.unmount.forEach((effect) => {
		didFlushPassiveEffects = true
		commitHookEffectListUnmount(Passive, effect)
	})
	pendingPassiveEffects.unmount = []

	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffects = true
		commitHookEffectListDestroy(Passive | HookHasEffect, effect)
	})
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffects = true
		commitHookEffectListCreate(Passive | HookHasEffect, effect)
	})
	pendingPassiveEffects.update = []
	flushSyncCallbackQueue()
	return didFlushPassiveEffects
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber
	let parent = node.return

	while (parent !== null) {
		node = parent
		parent = node.return
	}

	if (node.tag === HostRoot) {
		return node.stateNode
	}

	return null
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes)
	const existingClallbackNode = root.callbackNode

	// 没有其他更新了，证明当前这个是最后一个 update，直接清理掉
	if (updateLane === NoLane) {
		if (existingClallbackNode !== null) {
			unstable_cancelCallback(existingClallbackNode)
		}

		root.callbackNode = null
		root.callbackPriority = NoLane
		return
	}

	const currentPriority = updateLane
	const previousPriority = root.callbackPriority

	if (currentPriority === previousPriority) return

	if (existingClallbackNode !== null) {
		unstable_cancelCallback(existingClallbackNode)
	}

	let newCallbackNode = null

	if (updateLane === SyncLane) {
		// 同步调度 微任务
		if (__DEV__) {
			console.log('同步调度开始，优先级为：', SyncLane)
		}

		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
		scheduleMicroTask(flushSyncCallbackQueue)
	} else {
		// 异步调度 宏任务
		const schedulerPriority = lanesToSchedulerPriority(updateLane)
		// @ts-ignore
		newCallbackNode = scheduleCallback(
			schedulerPriority,
			performConcurrentWorkOnRoot.bind(null, root)
		)
	}

	root.callbackNode = newCallbackNode
	root.callbackPriority = currentPriority
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	const curCallbackNode = root.callbackNode
	// 保证 useEffect 都已经执行了
	const didFlushPassiveEffects = flushPassiveEffect(root.pendingPassiveEffects)
	if (didFlushPassiveEffects) {
		if (curCallbackNode !== root.callbackNode) {
			return null
		}
	}

	const lane = root.pendingLanes
	const currentCallbackNode = root.callbackNode

	if (lane === NoLane) {
		return null
	}

	const needSync = lane === SyncLane || didTimeout
	const exitStatus = renderRoot(root, lane, !needSync)

	ensureRootIsScheduled(root)

	// 中断
	if (exitStatus === RootInComplete) {
		if (root.callbackNode !== currentCallbackNode) {
			return null
		}
		return performConcurrentWorkOnRoot.bind(null, root)
	}

	if (exitStatus === RootCompleted) {
		const finishedWork = root.current.alternate
		root.finishedWork = finishedWork
		root.finishedLane = lane
		wipRootRenderLane = NoLane

		commitRoot(root)
	} else if (__DEV__) {
		console.error('还未实现的并发更新状态')
	}
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	const nextLane = getHighestPriorityLane(root.pendingLanes)

	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root)
		return
	}

	const exitStatus = renderRoot(root, nextLane, false)

	if (exitStatus === RootCompleted) {
		const finishedWork = root.current.alternate
		root.finishedWork = finishedWork
		root.finishedLane = nextLane
		wipRootRenderLane = NoLane

		commitRoot(root)
	} else if (__DEV__) {
		console.error('还未实现的同步更新状态')
	}
}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
	if (__DEV__) {
		console.log(`开始 ${shouldTimeSlice ? '并发' : '同步'}渲染`)
	}

	if (wipRootRenderLane !== lane) {
		// 初始化
		prepareFreshStack(root, lane)
	}

	do {
		try {
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync()
			break
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop 发生错误', e)
			}
			workInProgress = null
		}
	} while (true)

	// 中断执行
	if (shouldTimeSlice && workInProgress !== null) {
		return RootInComplete
	}
	// render 阶段执行完
	if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
		console.error('同步渲染未完成, render 阶段结束后 wip 不应该是 null')
	}

	return RootCompleted
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork
	const lane = root.finishedLane

	if (lane === NoLane && __DEV__) {
		console.error('commit阶段finishedLane不应该是NoLane')
	}

	root.finishedWork = null
	root.finishedLane = NoLane

	markRootFinished(root, lane)

	if (finishedWork === null) return

	if (__DEV__) {
		console.warn('commit 阶段开始执行', finishedWork)
	}

	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!rootDoesHavePassiveEffects) {
			rootDoesHavePassiveEffects = true
			scheduleCallback(normalPriority, () => {
				flushPassiveEffect(root.pendingPassiveEffects)
				return
			})
		}
	}

	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags

	if (subtreeHasEffect || rootHasEffect) {
		root.current = finishedWork

		commitMutationEffects(finishedWork, root)
	} else {
		root.current = finishedWork
	}

	rootDoesHavePassiveEffects = false
	ensureRootIsScheduled(root)
}

function workLoopSync() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress)
	}
}

function workLoopConcurrent() {
	while (workInProgress !== null && !unstable_shouldYield()) {
		performUnitOfWork(workInProgress)
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane)

	fiber.memoizedProps = fiber.pendingProps

	if (next !== null) {
		workInProgress = next
	} else {
		completeUnitOfWork(fiber)
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber

	do {
		completeWork(node)

		if (node.sibling !== null) {
			workInProgress = node.sibling
			return
		}

		node = node.return
		workInProgress = node
	} while (node !== null)
}
