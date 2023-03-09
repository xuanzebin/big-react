import {
	appendChildToContainer,
	commitUpdate,
	Container,
	insertBeforeChild,
	Instance,
	removeChild
} from 'hostConfig'

import { FiberNode, FiberRootNode } from './fiber'
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	Placement,
	Update
} from './fiberFlags'
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags'

let nextEffect: FiberNode | null = null

export const commitMutationEffects = (finishedWork: FiberNode) => {
	nextEffect = finishedWork

	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child

		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffect = child
		} else {
			// 向上遍历
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect)

				const sibling: FiberNode | null = nextEffect.sibling

				if (sibling !== null) {
					nextEffect = sibling
					break up
				}

				nextEffect = nextEffect.return
			}
		}
	}
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags

	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork)
		finishedWork.flags &= ~Placement
	}

	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork)
		finishedWork.flags &= ~Update
	}

	if ((flags & ChildDeletion) !== NoFlags) {
		const chilDeletions = finishedWork.deletions

		if (chilDeletions !== null) {
			chilDeletions.forEach((child) => {
				commitDeletion(child)
			})
		}
		finishedWork.flags &= ~ChildDeletion
	}
}

function commitDeletion(chilDeletion: FiberNode) {
	let rootHostNode: FiberNode | null = null

	commitNestedComponent(chilDeletion, (unmontFiber: FiberNode) => {
		switch (unmontFiber.tag) {
			case HostComponent:
				// TODO 解绑 ref
				if (rootHostNode === null) {
					rootHostNode = unmontFiber
				}
				return
			case HostText:
				if (rootHostNode === null) {
					rootHostNode = unmontFiber
				}
				return
			case FunctionComponent:
				// TODO useEffect unmount 解绑 ref
				return
			default:
				if (__DEV__) {
					console.warn('未实现的 unmount 类型', unmontFiber)
				}
				return
		}
	})

	if (rootHostNode !== null) {
		const node = rootHostNode as FiberNode
		const hostParent = getHostParent(rootHostNode)

		if (hostParent !== null) {
			removeChild(node.stateNode, hostParent)
		}

		node.child = null
		node.return = null
	}
}

function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void
) {
	let node = root
	while (true) {
		onCommitUnmount(node)

		if (node.child !== null) {
			node.child.return = node
			node = node.child
			continue
		}

		if (node === root) return

		while (node.sibling === null) {
			if (node.return === null || node.return === root) return

			node = node.return
		}

		node.sibling.return = node.return
		node = node.sibling
	}
}

function commitPlacement(finishedWork: FiberNode) {
	if (__DEV__) {
		console.warn('执行 Placement')
	}

	const hostParent = getHostParent(finishedWork)
	const before = getHostSibling(finishedWork)

	if (hostParent === null) return

	appendOrInsertPlacementNodeIntoContainer(finishedWork, hostParent, before)
}

function getHostParent(finishedWork: FiberNode): Container | null {
	let parent = finishedWork.return

	while (parent) {
		if (parent.tag === HostComponent) return parent.stateNode as Container

		if (parent.tag === HostRoot)
			return (parent.stateNode as FiberRootNode).container
		parent = parent.return
	}

	if (__DEV__ && finishedWork.tag !== HostRoot) {
		console.warn('未找到 host parent')
	}

	return null
}

function getHostSibling(fiber: FiberNode) {
	let node: FiberNode = fiber

	findSibling: while (node !== null) {
		while (node.sibling === null) {
			const parent = node.return

			if (
				parent === null ||
				parent.tag === HostRoot ||
				parent.tag === HostComponent
			) {
				return null
			}

			node = parent
		}

		node.sibling.return = node.return
		node = node.sibling

		while (node.tag !== HostText && node.tag !== HostComponent) {
			if ((node.flags & Placement) !== NoFlags) {
				continue findSibling
			}

			if (node.child === null) {
				continue findSibling
			} else {
				node.child.return = node
				node = node.child
			}
		}

		if ((node.flags & Placement) === NoFlags) {
			return node.stateNode
		}
	}
}

function appendOrInsertPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
	before?: Instance
) {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		if (before) {
			insertBeforeChild(finishedWork.stateNode, before)
		} else {
			appendChildToContainer(finishedWork.stateNode, hostParent)
		}
		return
	}

	const child = finishedWork.child

	if (child !== null) {
		appendOrInsertPlacementNodeIntoContainer(child, hostParent)
		let sibling: FiberNode | null = child.sibling

		while (sibling !== null) {
			appendOrInsertPlacementNodeIntoContainer(sibling, hostParent)

			sibling = sibling.sibling
		}
	}
}
