import { ReactElementType } from 'shared/ReactTypes'
// @ts-ignore
import ReactDOM from 'react-dom'
import { Container } from 'hostConfig'
import { DOMElement, elementPropsKeys } from './src/syntheticEvent'

const validEventTypeList = ['click']

type EventCallback = (e: Event) => void

interface Paths {
	bubble: EventCallback[]
	capture: EventCallback[]
}

interface SyntheticEvent extends Event {
	__stopPropagation: boolean
}

export function renderIntoDocument(element: ReactElementType) {
	const div = document.createElement('div')

	return ReactDOM.createRoot(div).render(element)
}

export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		console.warn(`当前不支持 ${eventType} 事件`)
		return
	}

	if (__DEV__) {
		console.log(`初始化事件: ${eventType}`)
	}

	container.addEventListener(eventType, (e: Event) => {
		dispatchEvent(container, eventType, e)
	})
}

function createSyntheticEvent(event: Event) {
	const syntheticEvent = event as SyntheticEvent
	syntheticEvent.__stopPropagation = false

	const originStopPropagation = event.stopPropagation

	event.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true

		if (originStopPropagation) {
			originStopPropagation()
		}
	}

	return syntheticEvent
}

function dispatchEvent(container: Container, eventType: string, event: Event) {
	const targetElement = event.target as DOMElement

	if (targetElement === null) {
		console.warn('事件不存在 target', event)
		return
	}

	const callbackPaths = collectPaths(targetElement, container, eventType)
	const { capture, bubble } = callbackPaths

	const syntheticEvent = createSyntheticEvent(event)

	triggerEventFlow(capture, syntheticEvent)

	if (!syntheticEvent.__stopPropagation) {
		triggerEventFlow(bubble, syntheticEvent)
	}
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
	for (let i = 0; i < paths.length; i++) {
		const callback = paths[i]

		callback.call(null, se)

		if (se.__stopPropagation) break
	}
}

function getEventCallbackNameFromEventType(eventType: string) {
	return {
		click: ['onClickCapture', 'onClick']
	}[eventType]
}

function collectPaths(
	targetElement: DOMElement,
	container: Container,
	eventType: string
) {
	const paths: Paths = {
		bubble: [],
		capture: []
	}

	while (targetElement !== null && targetElement !== container) {
		const elementProps = targetElement[elementPropsKeys]
		const eventCallbackNameList = getEventCallbackNameFromEventType(eventType)

		if (eventCallbackNameList) {
			eventCallbackNameList.forEach((value, i) => {
				const eventCallback = elementProps[value]

				if (eventCallback) {
					if (i === 0) {
						paths.capture.unshift(eventCallback)
					} else {
						paths.bubble.push(eventCallback)
					}
				}
			})
		}

		targetElement = targetElement.parentNode as DOMElement
	}

	return paths
}
