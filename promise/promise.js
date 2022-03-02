class SelfEvent{
  constructor() {
    this.eventList = {}
  }
  publish (type, ...data) {
    this.eventList[type]?.forEach(cb => {
      cb && typeof cb === 'function' && cb(...data)
    });
  }
  subscribe (type, cb) {
    if (!this.eventList[type]) {
      this.eventList[type] = []
    }
    this.eventList[type].push(cb)
  }
  unsubscribe (type) {
    if (this.eventList[type]) {
      delete this.eventList[type]
    }
  }
}

let window;
let doneFlush = 0;
let flush = [];
let handleAsyncFunc = null;

// 异步回调
const asyncCallback = () => {
  for (let i=0; i<doneFlush; i+=2){
    let callback = flush[i];
    let arg = flush[i+1];
    callback(arg);

    flush[i] = undefined;
    flush[i+1] = undefined;
  }
  doneFlush = 0;
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

const isNode = typeof process !== undefined
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
  flush[doneFlush] = cb;
  flush[doneFlush+1] = arg;

  doneFlush +=2;
  if (doneFlush === 2) {
    handleAsyncFunc();
  }
}


/**
 * link: https://promisesaplus.com/ Promises/A+规范
 * link: https://juejin.cn/post/6844903796129136654#heading-1
 * 优势：解耦函数跟相互关联逻辑的嵌套
 * Promise 功能点
 * promise对象参数 函数 函数的参数是2个函数resolve，reject
 *
 * promise状态 status:
 * 0 pending
 * 1 fulfilled
 * 2 rejected
 */
class SelfPromise {
  constructor (mainFunc) {
    this.status = 0;
    this.value = null;
    this.reason = null;
    this.Event = new SelfEvent();
    this.initCb(mainFunc);
  }
  initCb (mainFunc) {
    if (typeof mainFunc !== 'function') {
      throw new Error('Promise参数必须为函数');
    }

    try {
      mainFunc(this.resolveFunction.bind(this), this.rejectFunction.bind(this));
    } catch (err) {
      this.rejectFunction(err)
    }
  }
  resolveFunction (val) {
    if (this.status === 0) {
      this.status = 1;
      this.value = val;
      this.Event.publish('resolve', val);
    }
  }
  rejectFunction (val) {
    if (this.status === 0) {
      this.status = 2;
      this.reason = val;
      this.Event.publish('reject', val);
    }
  }
  resolvePromise (thenPromiseInstance, returnVal, resolve, reject) {
    if (returnVal === thenPromiseInstance) {
      reject(new TypeError('Chaining cycle detected for promise #<Promise>'));
    } else if (['function', 'object'].includes(typeof returnVal)) {
      let called;
      try {
        const then = returnVal?.then || null;
        // returnVal为thenable函数
        if (typeof then === 'function') {
          then.call(returnVal, (y) => {
            if (called) return;
            called = true;
            this.resolvePromise(thenPromiseInstance, y, resolve, reject);
          }, (err) => {
            if (called) return;
            called = true;
            reject(err)
          })
        } else {
          resolve(returnVal);
        }
      } catch (e) {
        if (called) return;
        called = true;
        reject(e)
      }
    } else {
      resolve(returnVal);
    }
  }
  then (resolvedCb, rejectedCb) {
    resolvedCb = typeof resolvedCb === 'function' ? resolvedCb : val => val;
    rejectedCb = typeof rejectedCb === 'function' ? rejectedCb : err => { throw err};

    const innerPromise = new Promise((resolved, rejected) => {
      switch (this.status) {
        case 0:
          this.Event.subscribe('resolve', (val) => {
            // micro事件
            asap(() => {
              try {
                this.resolvePromise(innerPromise, resolvedCb(val), resolved, rejected);
              } catch (e) {
                rejected(e)
              }
            }, 0)
          })
          this.Event.subscribe('reject', (val) => {
            asap(() => {
              try {
                this.resolvePromise(innerPromise, rejectedCb(val), resolved, rejected);
              } catch (e) {
                rejected(e)
              }
            }, 0)
          })
          break;
        case 1:
          asap(() => {
            try {
              this.resolvePromise(innerPromise, resolvedCb(this.value), resolved, rejected);
            } catch (e) {
              rejected(e)
              return false;
            }
          }, 0)
          break;
        case 2:
          asap(() => {
            try {
              this.resolvePromise(innerPromise, rejectedCb(this.reason), resolved, rejected);
            } catch (e) {
              rejected(e)
            }
          }, 0)
          break;
        default:
          return false;
      }
    })
    return innerPromise;
  }
  catch (rejectedCb) {
    return this.then(null, rejectedCb);
  }
  finally (cb) {
    return this.then((val) => {
      return SelfPromise.resolve(cb()).then(() => val)
    }, (err)=> {
      return SelfPromise.resolve(cb()).then(() => {
        throw err;
      })
    })
  }
  static all (promiseArr) {
    promiseArr = Array.from(promiseArr);
    let resultTemp = [];
    let resolveCount = 0;
    return new SelfPromise((resolve, reject) => {
      for (let count=0; count<promiseArr.length; count++) {
        SelfPromise.resolve(promiseArr[count])
          .then(val => {
            resolveCount++;
            resultTemp[count] = val;
            if (resolveCount === promiseArr.length) {
              resolve(resultTemp);
            }
          })
          .catch(err => {
            reject(err);
          })
      }
    })
  }
  static race (promiseArr) {
    promiseArr = Array.from(promiseArr);
    return new SelfPromise((resolve, reject) => {
      for (let promiseIns of promiseArr) {
        SelfPromise.resolve(promiseIns)
          .then(val => {
            resolve(val);
            return true;
          })
          .catch(err => {
            reject(err);
          })
      }
    })
  }
  static reject (cb) {
    return new SelfPromise((resolve, reject) => {
      SelfPromise.resolve(cb).then(reason => {
        reject(reason);
      })
    })
  }
  static resolve (resolveArg) {
    if (resolveArg instanceof SelfPromise){
      return resolveArg;
    }
    if (typeof resolveArg === 'object') {
      const then = resolveArg.then;
      // resolveArg为thenable函数，跟随函数的状态
      if (typeof then === 'function') {
        return new SelfPromise((resolve, reject) => {
          then(resolve, reject);
        })
      }
    } else {
      return new SelfPromise(resolve => resolve(resolveArg));
    }
  }
}

SelfPromise.defer = SelfPromise.deferred = function(){
  let dfd = {};
  dfd.promise = new SelfPromise((resolve, reject)=>{
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
}

module.exports = SelfPromise
