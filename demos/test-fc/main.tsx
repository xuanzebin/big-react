import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'

function App() {
	useEffect(() => {
		console.log('effect')
		return () => {
			console.log('cleanup')
		}
	}, [])
	return (
		<div>
			<Child />
			<div>hello world</div>
		</div>
	)
}

function Child() {
	return 'Child'
}

const container = document.getElementById('root')
const root = ReactDOM.createRoot(container)

root.render(<App />)


setTimeout(() => {
	root.render(null)
}, 100)
window.root = root
