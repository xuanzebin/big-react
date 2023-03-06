import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
	const [num, dispatch] = useState(100)
	// @ts-ignore
	window.dispatch = dispatch
	return num === 3 ? <Child /> : <div>{num}</div>
}

function Child() {
	return <span>big-react</span>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
)
