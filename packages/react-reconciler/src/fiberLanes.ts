import {
	unstable_getCurrentPriorityLevel,
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority
} from 'scheduler'
import { FiberRootNode } from './fiber'

export type Lane = number
export type Lanes = number

export const NoLane = 0b0000
export const NoLanes = 0b0000
export const SyncLane = 0b0001
export const InputContinuousLane = 0b0010
export const DefaultLane = 0b0100
export const IdleLane = 0b1000

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB
}

export function requestUpdateLane(): Lane {
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

	return IdleLane
}
