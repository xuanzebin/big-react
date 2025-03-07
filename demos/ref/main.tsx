import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
	const [isDel, del] = useState(false);
	const divRef = useRef(null);

	console.warn('render divRef', divRef.current);

	useEffect(() => {
		console.warn('useEffect divRef', divRef.current);
	}, []);
console.log('fucking you')
	return (
		<div ref={divRef} onClick={() => {
			console.log('fucking you 0')
			del(true)
			console.log('fucking you 1')
			del(false)
			console.log('fucking you 2')
			console.log('fucking you 3')
		}}>
			{isDel ? null : <Child />}
		</div>
	);
}

function Child() {
	return <p ref={(dom) => console.warn('dom is:', dom)}>Child</p>;
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
