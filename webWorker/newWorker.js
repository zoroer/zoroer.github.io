console.log(self)

self.onmessage = (e) => {
  let temp = e.data.value
  console.log('worker received data is ' + temp)
  self.setTimeout(() => {
    self.postMessage(temp + 10)
  }, 3000)
}
