export type Type = any
export type Key = any
export type Ref = any
export type Props = any
export type ElementType = any

export interface ReactElement {
	key: Key
	ref: Ref
	props: Props
	__mark: string
	type: ElementType
	$$typeof: symbol | number
}
