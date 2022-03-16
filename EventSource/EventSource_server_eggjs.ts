import { Controller } from 'egg';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PassThrough } = require('stream');

// let Counter = 0;

export default class eventSource extends Controller {
  public async send() {
    const { ctx } = this;
    const { req, res } = ctx;

    if (req.url === '/sendMes') {
      sendSSE();
    } else {
      res.writeHead(404);
      res.end();
    }

    function sendSSE() {
      ctx.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      // 类koa封装的服务器需要以 stream 的方式返回数据告知浏览器此次请求 未结束，知道服务器或者客户端主动停止传输行为。
      const stream = new PassThrough();

      // const id = 'id:' + Math.floor(Math.random() * 50) + '\n';
      // const event = 'event: mes\n';
      // const retry = 'retry: 10000\n';
      // const data = 'data:' + JSON.stringify({
      //   ts: new Date().toTimeString(),
      //   count: Counter++,
      // });

      setInterval(function() {
        stream.write('data: {\n');
        stream.write('data: "foo": "bar",\n');
        stream.write('data: "baz": 555\n');
        stream.write('data: }\n\n');
      }, 4 * 1000);

      // 返回一个stream
      ctx.body = stream;
    }
  }
}
