import { useState, useContext, memo } from 'react';
 
 
 export default function App() {
 	const [num, update] = useState(0);
 	console.log('App render ', num);
 	return (
 			<div
 				onClick={() => {
 					update(num + 1);
 				}}
 			>
 				<Cpn num={num} name={'cpn1'} />
 				<Cpn num={0} name={'cpn2'} />
 			</div>
 	);
 }
 
 const Cpn = memo(function ({ num, name }) {
 	console.log('Cpn render', num);
 	return (
 		<div>
      123 {name}:{num}
 		</div>
 	);
 });

