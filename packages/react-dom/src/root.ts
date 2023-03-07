import { Container } from 'hostConfig'
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler'
import { ReactElementType } from 'shared/ReactTypes'

import { initEvent } from './syntheticEvent'

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
