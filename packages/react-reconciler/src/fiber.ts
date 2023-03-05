import { Container } from 'hostConfig'
import { Props, Key, Ref, ReactElementType } from 'shared/ReactTypes'

import { FunctionComponent, HostComponent, WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'

export class FiberNode {
	ref: Ref

	key: Key

	type: any

	tag: WorkTag

	flags: Flags

	index: number

	stateNode: any

	memoizedState: any

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
		this.key = key
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
		this.memoizedState = null
		this.pendingProps = pendingProps
		this.updateQueue = null

		this.flags = NoFlags
		this.subtreeFlags = NoFlags
		this.alternate = null
		this.deletions = null
	}
}

export class FiberRootNode {
	container: Container
	current: FiberNode
	finishedWork: FiberNode | null

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container
		this.current = hostRootFiber
		this.finishedWork = null
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
	wip.memoizedState = current.memoizedState

	return wip
}

export function createFiberFromElement(element: ReactElementType) {
	const { type, key, props } = element
	let fiberTag: WorkTag = FunctionComponent

	if (typeof type === 'string') {
		fiberTag = HostComponent
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的 type 类型')
	}

	const fiber = new FiberNode(fiberTag, props, key)
	fiber.type = type

	return fiber
}
