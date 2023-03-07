import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
	const [num, dispatch] = useState(100)

	return <div onClick={() => dispatch(num + 1)}>{num}</div>
}

// function Child() {
// 	return <span>big-react</span>
// }

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<App />
)
