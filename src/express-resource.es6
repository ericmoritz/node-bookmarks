/* -*- mode: javascript -*- */
import {Left, Right} from 'fantasy-eithers'
import {Some, None} from 'fantasy-options'

const isPromise = v => v !== null && typeof v === 'object' && typeof v.then === 'function'

export default (cb) => (req, res) => {
  let handler = (data) => {
    if(isPromise(data)) {
      data.then(handler).done()
    } else if(data == None) {
      res.status(404)
      res.end()      
    } else if(data instanceof Left) {
      res.status(400)
      return handler(data.l)
    } else if(data instanceof Right) {
      return handler(data.r)
    } else if(data instanceof Some) {
      return handler(data.x)
    } else if(data == undefined) {
      res.status(204)
      res.end()
    } else {
      res.json(data)
    }
  }
  handler(cb(req, res))
}


