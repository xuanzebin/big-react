import { Container } from 'hostConfig'
import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler'
import { ReactElementType } from 'shared/ReactTypes'

const createRoot = (root: Container) => {
	const container = createContainer(root)

	return {
		render(element: ReactElementType) {
			updateContainer(element, container)
		}
	}
}

export { createRoot }
