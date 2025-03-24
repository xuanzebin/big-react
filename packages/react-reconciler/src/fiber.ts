import { Container } from 'hostConfig'
import { Props, Key, Ref, ReactElementType, Wakeable } from 'shared/ReactTypes'

import { Flags, NoFlags } from './fiberFlags'
import { Effect } from './fiberHooks'
import { Lanes, NoLanes } from './fiberLanes'
import { FunctionComponent, HostComponent, WorkTag, Fragment, ContextProvider, SuspenseComponent, OffscreenComponent, MemoComponent } from './workTags'
import { CallbackNode } from 'scheduler'
import { REACT_MEMO_TYPE, REACT_PROVIDER_TYPE, REACT_SUSPENSE_TYPE } from 'shared/ReactSymbols'
import { ContextItem } from './fiberContext'

interface FiberDependencies<Value> {
	firstContext: ContextItem<Value> | null
	lanes: Lanes
}

export class FiberNode {
	ref: Ref

	key: Key

	type: any

	tag: WorkTag

	flags: Flags

	index: number

	stateNode: any

	// hostRootFiber 的 memorizedState 是 ReactElement 整棵树本身
	memorizedState: any

	subtreeFlags: Flags

	pendingProps: Props

	memoizedProps: Props

	child: FiberNode | null

	return: FiberNode | null

	sibling: FiberNode | null

	alternate: FiberNode | null

	updateQueue: unknown

	deletions: FiberNode[] | null

	// current 和 wip 的 lanes 是保持一致的，可以理解为 current 的 lanes 是 wip 的存档，用于一些中断流程的记录和恢复
	lanes: Lanes

	childLanes: Lanes

	dependencies: FiberDependencies<any> | null

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.key = key || null
		this.tag = tag

		this.child = null
		this.return = null
		this.sibling = null

		this.index = 0
		this.ref = null
		// HostComponent <div> div DOM
		this.stateNode = null
		// FunctionComponent () => {}
		this.type = null

		this.memoizedProps = null
		this.memorizedState = null
		this.pendingProps = pendingProps
		this.updateQueue = null

		this.flags = NoFlags
		this.subtreeFlags = NoFlags
		this.alternate = null
		this.deletions = null

		this.lanes = NoLanes
		this.childLanes = NoLanes

		this.dependencies = null
	}
}

export interface PengdingPssiveEffects {
	update: Effect[]
	unmount: Effect[]
}

export class FiberRootNode {
	container: Container
	current: FiberNode
	finishedWork: FiberNode | null
	pendingLanes: Lanes
	finishedLane: Lanes
	pendingPassiveEffects: PengdingPssiveEffects

	callbackNode: CallbackNode | null
	callbackPriority: Lanes

	pingCache: WeakMap<Wakeable<any>, Set<Lanes>> | null

	suspendedLanes: Lanes

	pingedLanes: Lanes

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container
		this.current = hostRootFiber
		this.finishedWork = null
		this.pendingLanes = NoLanes
		this.finishedLane = NoLanes
		this.callbackNode = null
		this.pingCache = null
		this.suspendedLanes = NoLanes
		this.pingedLanes = NoLanes
		this.callbackPriority = NoLanes
		this.pendingPassiveEffects = {
			update: [],
			unmount: []
		}

		hostRootFiber.stateNode = this
	}
}

export function createWorInProgress(current: FiberNode, pendingProps: Props) {
	let wip = current.alternate

	if (wip === null) {
		wip = new FiberNode(current.tag, pendingProps, current.key)

		wip.stateNode = current.stateNode

		wip.alternate = current
		current.alternate = wip
	} else {
		wip.pendingProps = pendingProps
		wip.flags = NoFlags
		wip.subtreeFlags = NoFlags
		wip.deletions = null
	}

	wip.type = current.type
	wip.index = current.index
	wip.child = current.child
	wip.sibling = current.sibling
	wip.updateQueue = current.updateQueue
	wip.memoizedProps = current.memoizedProps
	wip.memorizedState = current.memorizedState
	wip.ref = current.ref

	wip.lanes = current.lanes
	wip.childLanes = current.childLanes

	const currentDeps = current.dependencies
	wip.dependencies = currentDeps === null ? null : {
		lanes: currentDeps.lanes,
		firstContext: currentDeps.firstContext
	}

	return wip
}

export function createFiberFromElement(element: ReactElementType) {
	const { type, key, props, ref } = element
	let fiberTag: WorkTag = FunctionComponent

	if (typeof type === 'string') {
		fiberTag = HostComponent
	} else if (typeof type === 'object') {
		switch (type.$$typeof) {
			case REACT_PROVIDER_TYPE:
				fiberTag = ContextProvider
				break
			case REACT_MEMO_TYPE:
				fiberTag = MemoComponent
				break
			default:
				if (__DEV__) {
					console.warn('未定义的 type 类型')
				}
				break
		}
	} else if (type === REACT_SUSPENSE_TYPE) {
		fiberTag = SuspenseComponent
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的 type 类型')
	}

	const fiber = new FiberNode(fiberTag, props, key)
	fiber.type = type
	fiber.ref = ref

	return fiber
}

export function createFiberFromFragment(element: any[], key: Key) {
	const fiber = new FiberNode(Fragment, element, key)

	return fiber
}

export interface OffscreenProps {
	mode: 'visible' | 'hidden'
	children: any
}

export function createFiberFromOffscreen(pendingProps: OffscreenProps) {
	const fiber = new FiberNode(OffscreenComponent, pendingProps, null)

	return fiber
}

