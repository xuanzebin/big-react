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
import { MutationMask, NoFlags, PassiveEffect } from './fiberFlags'
import {
	getHighestPriorityLane,
	Lane,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes'
import { flushSyncCallbackQueue, scheduleSyncCallback } from './syncTaskQueue'
import { scheduleMicroTask } from 'hostConfig'
import {
	unstable_NormalPriority as normalPriority,
	unstable_scheduleCallback as scheduleCallback
} from 'scheduler'
import { HookHasEffect, Passive } from './hooksEffectTags'

let workInProgress: FiberNode | null = null
let wipRootRenderLane: Lane = NoLane
let rootDoesHavePassiveEffects = false

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
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
	pendingPassiveEffects.unmount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect)
	})
	pendingPassiveEffects.unmount = []

	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestroy(Passive | HookHasEffect, effect)
	})
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect)
	})
	pendingPassiveEffects.update = []
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes)

	if (updateLane === NoLane) {
		return
	}

	if (updateLane === SyncLane) {
		// 同步调度 微任务
		if (__DEV__) {
			console.log('同步调度开始，优先级为：', SyncLane)
		}

		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
		scheduleMicroTask(flushSyncCallbackQueue)
	} else {
		// 异步调度 宏任务
	}
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

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLane(root.pendingLanes)

	if (nextLane !== SyncLane) {
		ensureRootIsScheduled(root)
		return
	}

	// 初始化
	prepareFreshStack(root, lane)

	do {
		try {
			workLoop()
			break
		} catch (e) {
			if (__DEV__) {
				console.warn('workLoop 发生错误', e)
			}
			workInProgress = null
		}
	} while (true)

	const finishedWork = root.current.alternate

	root.finishedWork = finishedWork
	root.finishedLane = lane

	wipRootRenderLane = NoLane

	if (__DEV__) {
		console.warn('finishedWork 生成完毕', finishedWork)
	}

	commitRoot(root)
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
		(finishedWork.flags & PassiveEffect) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveEffect) !== NoFlags
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

function workLoop() {
	while (workInProgress !== null) {
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
