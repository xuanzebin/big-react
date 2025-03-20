import { useState } from 'react';
 
 export default function App() {
 	return (
 		<Page test={false}></Page>
 	);
 }

 function Page ({ test }) {
  console.log('test is: ', test)
  return (
    <PageMiddle />
  );
 }
 function PageMiddle () {
    const [num, update] = useState(0);
    return (
      <div
        onClick={() => {
          update(1);
        }}
      >
        <Cpn />
      </div>
    );
 }
 
 function Cpn() {
 	console.log('cpn render');
 	return <div>cpn</div>;
 }
 