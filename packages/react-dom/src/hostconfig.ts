export type Container = Element
export type Instance = Element

export const createInstance = (type: string, props: any): Instance => {
	const instance = document.createElement(type)

	return instance
}

export const createTextNodeInstance = (content: string) => {
	return document.createTextNode(content)
}

export const appendInitialChild = (
	child: Instance,
	parent: Instance | Container
) => {
	return parent.appendChild(child)
}

export const appendChildToContainer = appendInitialChild
