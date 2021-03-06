let ProxyIns = {}
const Event = new SelfEvent()

window.onload = function() {
  reactData(data)
  listDom(document.querySelector("#app"))
}

// 拦截数据
function reactData(obj) {
  ProxyIns = new Proxy(obj, {
    get (target, propKey) {
      return Reflect.get(target, propKey);
    },
    set (target, propKey, value) {
      Reflect.set(target, propKey, value);
      Event.publish('update',  value);
    }
  });
}

/*
 * 渲染dom上应用的vue数据
 * rootEle 扫描dom内所有子节点，处理包含特殊语法的元素
 */
function listDom (rootEle) {
  Array.from(rootEle.children).forEach(ele => {
    // 自定义属性
    Array.from(ele.attributes).forEach(attr => {
      compileDirective(ele, attr);
    })

    // dom变量
    const innerDom = ele.innerHTML;
    ele.innerHTML = compileDom(innerDom);

    Event.subscribe('update',  (value) => {
      ele.innerHTML = compileDom(innerDom)
    })
  });
}

// 处理自定义属性
function compileDirective (ele, attr) {
  const attrName = attr.localName;
  const tagName = ele.tagName.toLowerCase();
  // v-model指令
  if (attrName.includes('v-model')) {
    const inputEleList = ['input', 'textarea'];
    if (inputEleList.includes(tagName)) {
      var bindAttr = ele.getAttribute('v-model');
      ele.value = ProxyIns[bindAttr];
      ele.addEventListener('input', (e) => {
        const nowVal = e.target.value;
        ProxyIns[bindAttr] = nowVal;
      });

      Event.subscribe('update', (value) => {
        ele.value = ProxyIns[bindAttr]
      })
    }
  } else {}

  // 事件
  const DefineEventTag = ['v-on:', '@']
  DefineEventTag.forEach(tag => {
    if (attrName.includes(tag)) {
      var eventName = attrName.split(tag)[1];
      var eventHandler = ele.getAttribute(attrName);
      ele.addEventListener(eventName, window[eventHandler])
    }
  })
}

// 处理dom变量值
function compileDom(innerDom) {
  var reg = /{{(.*?)}}/g;
  return innerDom.replace(reg, (match, $1) => ProxyIns[$1]);
}

function clickTest() {
  ProxyIns.val2 = 11111;
}
