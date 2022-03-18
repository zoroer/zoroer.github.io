onmessage = (e) => {
  let temp = e.data.value
  console.log('worker received data is ' + temp)
  setTimeout(() => {
    postMessage(temp + 10)
  }, 3000)
}
