const supoortSymbol = typeof Symbol === 'function' && Symbol.for

export const REACT_ELEMENT_TYPE = supoortSymbol
	? Symbol.for('react.element')
	: 0xeac7

export const REACT_FRAGMENT_TYPE = supoortSymbol
	? Symbol.for('react.fragment')
	: 0xeacb
