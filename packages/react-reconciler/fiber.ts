import { Props, Key, Ref } from 'shared/ReactTypes'
import { Flags, NoFlags } from './fiberFlags'
import { WorkTag } from './workTags'

export class FiberNode {
	ref: Ref

	key: Key

	type: any

	tag: WorkTag

	flags: Flags

	index: number

	stateNode: any

	pendingProps: Props

	memoizedProps: Props

	child: FiberNode | null

	return: FiberNode | null

	sibling: FiberNode | null

	alternate: FiberNode | null

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
		this.pendingProps = pendingProps

		this.flags = NoFlags
		this.alternate = null
	}
}
