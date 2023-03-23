import {
	appendChildToContainer,
	commitUpdate,
	Container,
	insertBeforeChild,
	Instance,
	removeChild
} from 'hostConfig'

import { FiberNode, FiberRootNode, PengdingPssiveEffects } from './fiber'
import {
	ChildDeletion,
	Flags,
	MutationMask,
	NoFlags,
	PassiveEffect,
	Placement,
	Update
} from './fiberFlags'
import { Effect, FCUpdateQueue } from './fiberHooks'
import { HookHasEffect } from './hooksEffectTags'
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags'

let nextEffect: FiberNode | null = null

export const commitMutationEffects = (
	finishedWork: FiberNode,
	root: FiberRootNode
) => {
	nextEffect = finishedWork

	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child

		if (
			(nextEffect.subtreeFlags & (MutationMask | PassiveEffect)) !== NoFlags &&
			child !== null
		) {
			nextEffect = child
		} else {
			// 向上遍历
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect, root)

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

const commitMutationEffectsOnFiber = (
	finishedWork: FiberNode,
	root: FiberRootNode
) => {
	const flags = finishedWork.flags

	if ((flags & Placement) !== NoFlags) {
		if (__DEV__) console.warn('执行 Placement')

		commitPlacement(finishedWork)
		finishedWork.flags &= ~Placement
	}

	if ((flags & Update) !== NoFlags) {
		if (__DEV__) console.warn('执行 Update')

		commitUpdate(finishedWork)
		finishedWork.flags &= ~Update
	}

	if ((flags & ChildDeletion) !== NoFlags) {
		if (__DEV__) console.warn('执行 ChildDeletion')

		const chilDeletions = finishedWork.deletions

		if (chilDeletions !== null) {
			chilDeletions.forEach((child) => {
				commitDeletion(child, root)
			})
		}
		finishedWork.flags &= ~ChildDeletion
	}

	if ((flags & PassiveEffect) !== NoFlags) {
		commitPassiveEffect(finishedWork, root, 'update')
		finishedWork.flags &= ~PassiveEffect
	}
}

function commitPassiveEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PengdingPssiveEffects
) {
	if (
		fiber.tag !== FunctionComponent ||
		(type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)
	) {
		return
	}

	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>

	if (updateQueue !== null) {
		if (updateQueue.lastEffect === null) {
			console.error('当 FC 存在 PassiveEffect，updateQueue 不应该为 null')
			return
		}

		root.pendingPassiveEffects[type].push(updateQueue.lastEffect)
	}
}

function commitHookEffectList(
	flags: Flags,
	lastEffect: Effect,
	callback: (effect: Effect) => void
) {
	let effect = lastEffect.next as Effect

	do {
		if ((effect.tag & flags) === flags) {
			callback(effect)
		}

		effect = effect.next as Effect
	} while (effect !== lastEffect.next)
}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect: Effect) => {
		const { destroy } = effect

		if (typeof destroy === 'function') {
			destroy()
		}

		effect.tag &= ~HookHasEffect
	})
}

export function commitHookEffectListDestroy(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect: Effect) => {
		const { destroy } = effect

		if (typeof destroy === 'function') {
			destroy()
		}
	})
}

export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect: Effect) => {
		const { create } = effect

		if (typeof create === 'function') {
			effect.destroy = create()
		}
	})
}

function recordHostChildrenDelete(
	childToDelete: FiberNode[],
	unmountFiber: FiberNode
) {
	const lastOne = childToDelete[childToDelete.length - 1]

	if (!lastOne) {
		childToDelete.push(unmountFiber)
	} else {
		let node = lastOne.sibling

		while (node !== null) {
			if (node === unmountFiber) {
				childToDelete.push(unmountFiber)
				break
			}

			node = node.sibling
		}
	}
}

function commitDeletion(chilDeletion: FiberNode, root: FiberRootNode) {
	const rootChildToDelete: FiberNode[] = []

	commitNestedComponent(chilDeletion, (unmontFiber: FiberNode) => {
		switch (unmontFiber.tag) {
			case HostComponent:
				// TODO 解绑 ref
				recordHostChildrenDelete(rootChildToDelete, unmontFiber)
				return
			case HostText:
				recordHostChildrenDelete(rootChildToDelete, unmontFiber)
				return
			case FunctionComponent:
				// TODO useEffect unmount 解绑 ref
				commitPassiveEffect(unmontFiber, root, 'unmount')
				return
			case Fragment:
				return
			default:
				if (__DEV__) {
					console.warn('未实现的 unmount 类型', unmontFiber)
				}
				return
		}
	})

	if (rootChildToDelete.length) {
		const hostParent = getHostParent(chilDeletion)

		rootChildToDelete.forEach((node) => {
			if (hostParent !== null) {
				removeChild(node.stateNode, hostParent)
			}

			node.child = null
			node.return = null
		})
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
			insertBeforeChild(hostParent, finishedWork.stateNode, before)
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
