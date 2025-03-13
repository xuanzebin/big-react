import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'

function App() {
	const [num, update] = useState(100)

	return (
		<ul onClick={() => update(num => num - 1)}>
			{new Array(num).fill(0).map((_, i) => {
				return <Child key={i}>{i}</Child>
			})}
		</ul>
	);
}

function Child({ children }) {
	return <li>{children}</li>
}

const root = createRoot(document.querySelector('#root')!)

root.render(<App />);
