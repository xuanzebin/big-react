const supoortSymbol = typeof Symbol === 'function' && Symbol.for

export const REACT_ELEMENT_TYPE = supoortSymbol
	? Symbol.for('react.element')
	: 0xeac7

export const REACT_FRAGMENT_TYPE = supoortSymbol
	? Symbol.for('react.fragment')
	: 0xeaca

export const REACT_CONTEXT_TYPE = supoortSymbol
	?	Symbol.for('react.context')
	: 0xeacb

export const REACT_PROVIDER_TYPE = supoortSymbol
	? Symbol.for('react.provider')
	: 0xeacc

export const REACT_SUSPENSE_TYPE = supoortSymbol
	? Symbol.for('react.suspense')
	: 0xeace
