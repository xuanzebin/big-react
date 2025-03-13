import { Container } from 'hostConfig'
import { Props, Key, Ref, ReactElementType, Wakeable } from 'shared/ReactTypes'

import { Flags, NoFlags } from './fiberFlags'
import { Effect } from './fiberHooks'
import { Lanes, NoLanes } from './fiberLanes'
import { FunctionComponent, HostComponent, WorkTag, Fragment, ContextProvider, SuspenseComponent, OffscreenComponent } from './workTags'
import { CallbackNode } from 'scheduler'
import { REACT_PROVIDER_TYPE, REACT_SUSPENSE_TYPE } from 'shared/ReactSymbols'

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
	wip.child = current.child
	wip.updateQueue = current.updateQueue
	wip.memoizedProps = current.memoizedProps
	wip.memorizedState = current.memorizedState
	wip.ref = current.ref

	return wip
}

export function createFiberFromElement(element: ReactElementType) {
	const { type, key, props, ref } = element
	let fiberTag: WorkTag = FunctionComponent

	if (typeof type === 'string') {
		fiberTag = HostComponent
	} else if (typeof type === 'object' && type.$$typeof === REACT_PROVIDER_TYPE) {
		fiberTag = ContextProvider
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
