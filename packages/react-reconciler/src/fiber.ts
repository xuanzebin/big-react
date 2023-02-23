import { Container } from 'react-reconciler/src/hostConfig'
import { Props, Key, Ref } from 'shared/ReactTypes'

import { WorkTag } from './workTags'
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

	pendingProps: Props

	memoizedProps: Props

	child: FiberNode | null

	return: FiberNode | null

	sibling: FiberNode | null

	alternate: FiberNode | null

	updateQueue: unknown

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
		this.alternate = null
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
	}

	wip.type = current.type
	wip.child = current.child
	wip.updateQueue = current.updateQueue
	wip.memoizedProps = current.memoizedProps
	wip.memoizedState = current.memoizedState

	return wip
}
