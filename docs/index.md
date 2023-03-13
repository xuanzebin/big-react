# 粗品 React 源码

React 这个开源库，作为当今前端界使用最多的框架之一，相信大家对其都不陌生，它的使用也并不困难，甚至可以说非常简单，因为它引入了组件的概念，使得我们可以通过使用 JSX 语法和简单的数据和逻辑操作，来表达我们需要渲染的 UI 界面。

每一个使用 React 的人，估计都会很好奇，React 的底层原理到底是怎么样的？核心的流程都做了些什么？是的，曾经的我，和你也有一样的疑问，但 React 的源码阅读起来并不容易，一方面，React 团队也在不断地迭代 React 本身，因此很多时候在源码里会出现很多版本与版本之间过渡的代码，很容易让读者产生疑惑。另一方面，作为一款成熟的应用级框架，其代码量和阅读难度还是明明白白地放在这里的。

因此，作为过来人，我希望在本篇文章中，为你大致捋顺 React 的核心流程，告诉你 React 都有哪几个阶段，且这几个阶段都做了什么，以及也会用伪代码来帮助你理解流程和源码，使你未来在阅读和理解 React 源码的时候，可以提供一定的帮助。

## 结构定义

首先在了解核心流程时，我们需要对 React 中存在的数据结构有一定的了解，其实总的来说，一共存在四种数据结构：

- DOMElement
- ReactElement
- FiberNode
- FiberRootNode

第一种 DOMElement 应该不需要我细说，对应的其实就是我们在浏览器中能肉眼看到的一个又一个的节点。

而第二种 ReactElement，代表 React 元素，它是通过 createElement 这个 api 产生的，其实就是我们在编写 React 代码时，编写的 JSX 结构经过编译后返回的结果

```
// JSX
const MyReactElement = (<div>123</div>)

// 编译后
const MyReactElement = createElement('div', {}, '123')
```

第三种，Fiber Node，它是 React 内部的工作单元，我们通过解析 ReactElement，可以在 React 内部生成一棵节点树，这棵节点树便是由一个个 FiberNode 组成的，FiberNode 存在着很多种类型，其中大部分的类型都对应着不同的 ReactElement，如 type 为 div、span 等原生元素的 ReactElment，它对应的 FiberNode 类型则为 HostComponent，而文本类型则对应 HostText，函数组件类型则对应 FunctionComponent 等等，这里需要注意的是 FiberNode 存在着一种特殊的类型 HostRoot，他代表着整个节点树的根节点。
而在根节点之上，存在着一个 FiberRootNode，也就是我们的第四种数据结构，它存在着一个 current 字段，连接着这棵节点树的 HostRoot，以及一个 container 字段，用来存储我们挂载的 DOMElement 节点。
为什么需要一个 FiberRootNode 结构来连接 HostRoot 呢？这是因为 React 使用了双缓冲区的技术方案来处理生产者和消费者供需不一致的场景。具体的实例方式为每次在渲染新的 UI 结构前，都会先构造一颗新的完整节点树，然后将 FiberRootNode 的 current 指向这棵新的节点树，再对新的节点树进行整体的渲染。而新旧两棵节点树又通过 alternate 这个字段进行连接，我们会将目前已经渲染的节点树称为 current，正在构造的节点树称为 workInProgress。
