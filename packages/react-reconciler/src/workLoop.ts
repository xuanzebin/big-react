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
	commitLayoutEffects,
	commitMutationEffects
} from './commitWork'
import { HostEffectMask, MutationMask, NoFlags, PassiveMask } from './fiberFlags'
import {
	getNextLane,
	Lane,
	lanesToSchedulerPriority,
	markRootFinished,
	markRootSuspended,
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
import { getSuspenseThenable, SuspenseException } from './thenable'
import { resetHooksOnUnwind } from './fiberHooks'
import { unwindWork } from './fiberUnwindWork'
import { throwException } from './fiberThrow'

type RootExitStatus = number
const RootInProgress: RootExitStatus = 0
const RootInComplete: RootExitStatus = 1
const RootCompleted: RootExitStatus = 2
const RootDidNotComplete: RootExitStatus = 3
let workInProgressRootExitStatus: RootExitStatus = RootInProgress
// TODO: 还有一种情况，执行报错待补充

let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
let rootDoesHavePassiveEffects = false

type SuspendedReason = typeof NotSuspended | typeof SuspendedOnData
 const NotSuspended = 0
 const SuspendedOnData = 6
let workInProgressSuspendedReason: SuspendedReason = NotSuspended
let workInProgressThrownValue: any = null

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishedLane = NoLane
	root.finishedWork = null
	workInProgress = createWorInProgress(root.current, {})
	wipRootRenderLane = lane

	workInProgressRootExitStatus = RootInProgress
	workInProgressSuspendedReason = NotSuspended
	workInProgressThrownValue = null
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateLaneFromFiberToRoot(fiber, lane)

	markRootUpdated(root, lane)
	ensureRootIsScheduled(root)
}

export function markRootUpdated(root: FiberRootNode, lane: Lane) {
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

function markUpdateLaneFromFiberToRoot(fiber: FiberNode, lane: Lane) {
	let node = fiber
	let parent = node.return

	while (parent !== null) {
		parent.childLanes = mergeLanes(parent.childLanes, lane)
		const alternate = parent.alternate
		if (alternate !== null) {
			alternate.childLanes = mergeLanes(alternate.childLanes, lane)
		}

		node = parent
		parent = node.return
	}

	if (node.tag === HostRoot) {
		return node.stateNode
	}

	return null
}

export function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getNextLane(root)
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
		if (__DEV__) {
			console.log('异步调度开始，优先级为：', SyncLane)
		}
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

	const nextLane = getNextLane(root)
	const currentCallbackNode = root.callbackNode

	if (nextLane === NoLane) {
		return null
	}

	const needSync = nextLane === SyncLane || didTimeout
	const exitStatus = renderRoot(root, nextLane, !needSync)

	switch (exitStatus) {
		case RootInComplete: {
			if (root.callbackNode !== currentCallbackNode) {
				return null
			}
			return performConcurrentWorkOnRoot.bind(null, root)
		}
		case RootCompleted: {
			const finishedWork = root.current.alternate
			root.finishedWork = finishedWork
			root.finishedLane = nextLane
			wipRootRenderLane = NoLane

			commitRoot(root)
			break
		}
		case RootDidNotComplete: {
			wipRootRenderLane = NoLane
			markRootSuspended(root, nextLane)
			ensureRootIsScheduled(root)
			break
		}
		default:
			if (__DEV__) {
				console.error('还未实现的并发更新状态')
			}
			break
	}

}

function performSyncWorkOnRoot(root: FiberRootNode) {
	const nextLane = getNextLane(root)

	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root)
		return
	}

	const exitStatus = renderRoot(root, nextLane, false)

	switch (exitStatus) {
		case RootCompleted: {
			const finishedWork = root.current.alternate
			root.finishedWork = finishedWork
			root.finishedLane = nextLane
			wipRootRenderLane = NoLane

			commitRoot(root)
			break
		}
		case RootDidNotComplete: {
			wipRootRenderLane = NoLane
			markRootSuspended(root, nextLane)
			ensureRootIsScheduled(root)
			break
		}
		default:
			if (__DEV__) {
				console.error('还未实现的并发更新状态', exitStatus)
			}
			break
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
			if (
				workInProgressSuspendedReason !== NotSuspended &&
				workInProgress !== null
			) {
				const thrownValue = workInProgressThrownValue
				workInProgressThrownValue = null
				workInProgressSuspendedReason = NotSuspended

				throwAndUnwindWorkLoop(root, workInProgress, thrownValue, lane)
			}
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync()
			break
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop 发生错误', e)
			}
			handleThrow(root, e)
		}
	} while (true)

	if (workInProgressRootExitStatus !== RootInProgress) {
		return workInProgressRootExitStatus
	}

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

function unwindUnitOfWork(unitOfWork: FiberNode) {
	let incompoleteWork = unitOfWork
	do {
		const next = unwindWork(incompoleteWork)

		if (next !== null) {
			next.flags &= HostEffectMask
			workInProgress = next
			return
		}

		const returnFiber = incompoleteWork.return as FiberNode
		if (returnFiber !== null) {
			returnFiber.deletions = null
		}
		incompoleteWork = returnFiber
	} while (incompoleteWork !== null)
	
	// 没有边界中指 unwind 流程，一直到 root
	workInProgress = null
	workInProgressRootExitStatus = RootDidNotComplete
}

function throwAndUnwindWorkLoop(root: FiberRootNode, unitOfWork: FiberNode, thrownValue: any, lane: Lane) {
	resetHooksOnUnwind(unitOfWork)
	throwException(root, thrownValue, lane)
	unwindUnitOfWork(unitOfWork)
}

function handleThrow(root: FiberRootNode, thrownValue: any): void {
	if (thrownValue === SuspenseException) {
		workInProgressSuspendedReason = SuspendedOnData
		thrownValue = getSuspenseThenable()
	} else {
		// TODO Error Boundary
	}
	workInProgressThrownValue = thrownValue
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
		commitMutationEffects(finishedWork, root)

		root.current = finishedWork

		commitLayoutEffects(finishedWork, root)
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
