let window;
let handleAsyncFunc = null;
let asyncFlushCb = null;
let asyncFlushParams = null;

// 异步回调
const asyncCallback = () => {
  asyncFlushCb(asyncFlushParams);
  asyncFlushCb = null;
  asyncFlushParams = null;
}

function asyncMutationObserver() {
  let count = 0
  const MO = new MutationObserver(asyncCallback)
  const ele = document.createTextNode('')
  MO.observe(ele, {
    characterData: true
  })
  return () => {
    ele.data = ++count
  }
}

function asyncMessageChannel() {
  const { port1, port2 } = new MessageChannel()
  port1.onmessage = asyncCallback;
  return () => port2.postMessage(true)
}

function asyncNextTick() {
  return () => process.nextTick(asyncCallback)
}

function asyncSetTimeout() {
  return () => setTimeout(asyncCallback, 0)
}

const isNode = window === undefined && typeof process !== undefined
const canUseMutationObserver = window?.MutationObserver !== undefined
const canUseMessageChannel = window?.MessageChannel !== undefined
if (isNode) {
  handleAsyncFunc = asyncNextTick()
} else if (canUseMutationObserver) {
  handleAsyncFunc = asyncMutationObserver()
} else if (canUseMessageChannel) {
  handleAsyncFunc = asyncMessageChannel()
} else {
  handleAsyncFunc = asyncSetTimeout()
}

// 异步入口
const asap = (cb, arg) => {
  asyncFlushCb = cb;
  asyncFlushParams = arg;
  handleAsyncFunc();
}
