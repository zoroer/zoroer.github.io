
const http = require('http');
// const router = require('../router/index')
let Counter = 0;

const server = http.createServer(function (req, res) {
  if (req.url === '/sendMes') {
    sendSSE();
  } else {
    res.writeHead(404);
    res.end();
  }

  function sendSSE() {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      "Connection": 'keep-alive',
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "DELETE,PUT,POST,GET,OPTIONS"
    });

    const id = 'id:' + Counter + '\n';
    const event = 'event: mes\n';
    const retry = 'retry: 10000\n';
    const data = 'data:' + JSON.stringify({
      ts: new Date().toTimeString(),
      count: Math.floor(Math.random() * 50),
    });

    setInterval(function() {
      Counter++;
      res.write(`${id}`);
      res.write(`${retry}`);
      res.write(`${event}`);
      res.write(`${data}\n\n`);
    }, 10 * 1000);
  }
});

server.listen('3334', function () {
  console.log('服务在3334端口启动');
});
