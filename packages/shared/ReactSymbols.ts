const supoortSymbol = typeof Symbol === 'function' && Symbol.for

export const REACT_ELEMENT_TYPE = supoortSymbol
	? Symbol.for('react.element')
	: 0xeac7
