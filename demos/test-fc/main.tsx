import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

// const performHeavyComputation = () => {
//   let result = 0;
//   for (let i = 0; i < 1e6; i++) {
//     result += i;
//   }
//   return result;
// };
  // 模拟一个超耗时任务
function Child() {
  useEffect(() => {
    console.log('[TaroReact], useEffect mount 执行')

    return () => {
      console.log('[TaroReact], useEffect mount 卸载')
    }
  }, [])
  // 执行耗时任务
  // performHeavyComputation()
  return (
    <div className='text'>
      <span>Child</span>
    </div>
  );
}

function Index() {
  const [count, setCount] = useState(0);
  const [children, setChildren] = useState<any>([]);
  // const [isPending, startTransition] = useTransition();

  const addChildren = () => {
    const newChildren = Array.from({ length: 2 }, (_, i) => i); // 创建 1,000,000 个子组件
    setChildren((prev) => [...prev, ...newChildren]);
    // startTransition(() => {
    //   const newChildren = Array.from({ length: 20 }, (_, i) => i); // 创建 1,000,000 个子组件
    //   setChildren((prev) => [...prev, ...newChildren]);
    // });
  };

  const breakChildren = () => {
    setCount(1)
  }
  // console.log('[TaroReact]isPending: ', isPending)

  return (
    <div>
      
      <div>
        <span>React 超耗时任务测试</span>
      </div>
      <div className='buttonContainer'>
        <span className='buttonText1' onClick={addChildren}>
          添加 1,000,000 个 Child 组件
        </span>
        <span className='buttonText2' onClick={breakChildren}>
          打断插入一个元素
        </span>
      </div>
      <div>
        {
          count === 1 ? <span>这是打断插入的元素1</span> : null
        }
        {
          count === 1 ? <span>这是打断插入的元素2</span> : null
        }
        {
          count === 1 ? <span>这是打断插入的元素3</span> : null
        }
        {/* {isPending ? <span className='buttonText2' onClick={breakChildren}>
            Child 组件渲染中...
          </span> : null} */}
        {children.map((_, index) => (
          <Child key={index} />
        ))}
      </div>
    </div>
  );
}

const root = createRoot(document.querySelector('#root')!)

root.render(<Index />);
