import {
	unstable_getCurrentPriorityLevel,
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority
} from 'scheduler'
import { FiberRootNode } from './fiber'
import ReactCurrentBatchConfig from 'react/src/currentBatchConfig'

export type Lane = number
export type Lanes = number

export const NoLane = 0b0000
export const NoLanes = 0b0000
export const SyncLane = 0b00001
export const InputContinuousLane = 0b00010
export const DefaultLane = 0b00100
export const TransitionLane = 0b01000
export const IdleLane = 0b10000

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB
}

export function requestUpdateLane(): Lane {
	const isTransiton = ReactCurrentBatchConfig.transition !== null
	if (isTransiton) {
		return TransitionLane
	}

	const currentSchedulerPriority = unstable_getCurrentPriorityLevel()
	const lane = schedulerPriorityToLane(currentSchedulerPriority)

	return lane
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes
}

export function isSubsetOfLanes(set: Lanes, subset: Lanes): boolean {
	return (set & subset) === subset
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane
	root.suspendedLanes = NoLanes
	root.pingedLanes = NoLanes
}

export function lanesToSchedulerPriority(lanes: Lanes): number {
	const lane = getHighestPriorityLane(lanes)

	if (lane === SyncLane) {
		return unstable_ImmediatePriority
	}
	if (lane === InputContinuousLane) {
		return unstable_UserBlockingPriority
	}
	if (lane === DefaultLane) {
		return unstable_NormalPriority
	}

	return unstable_IdlePriority
}

export function schedulerPriorityToLane(priority: number): Lane {
	if (priority === unstable_ImmediatePriority) {
		return SyncLane
	}
	if (priority === unstable_UserBlockingPriority) {
		return InputContinuousLane
	}
	if (priority === unstable_NormalPriority) {
		return DefaultLane
	}

	return NoLane
}

export function markRootPinged (root: FiberRootNode, pingedLane: Lane) {
	root.pingedLanes |= root.suspendedLanes & pingedLane
}

export function markRootSuspended(root: FiberRootNode, suspendedLane: Lane) {
	root.suspendedLanes |= suspendedLane
	root.pendingLanes &= ~suspendedLane
}

export function getNextLane(root: FiberRootNode): Lane {
	const pendingLanes = root.pendingLanes

	if (pendingLanes === NoLanes) {
		return NoLane
	}
	
	let nextLane = NoLane

	const suspendedLanes = pendingLanes & ~root.suspendedLanes
	if (suspendedLanes !== NoLanes) {
		nextLane = getHighestPriorityLane(suspendedLanes)
	} else {
		const pingedLanes = pendingLanes & root.pingedLanes
		if (pingedLanes !== NoLanes) {
			nextLane = getHighestPriorityLane(pingedLanes)
		}
	}

	return nextLane
}

export function includesSomeLanes(set: Lanes, subset: Lane | Lanes): boolean {
	return (set & subset) !== NoLanes
}

export function removeLanes(set: Lanes, subset: Lane | Lanes): Lanes {
	return set & ~subset
}
