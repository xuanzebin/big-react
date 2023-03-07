import { Container } from 'hostConfig'
import { initEvent } from 'react-dom/test-utils'
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler'
import { ReactElementType } from 'shared/ReactTypes'

const createRoot = (root: Container) => {
	const container = createContainer(root)

	return {
		render(element: ReactElementType) {
			initEvent(root, 'click')
			return updateContainer(element, container)
		}
	}
}

export { createRoot }
