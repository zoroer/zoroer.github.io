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
