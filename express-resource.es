/* -*- mode: javascript -*- */
import {Left, Right} from 'fantasy-eithers'
import {Some, None} from 'fantasy-options'

const isPromise = v => v !== null && typeof v === 'object' && typeof v.then === 'function'

export default (cb) => (req, res) => {
  let handler = (data) => {
    if(data == None) {
      res.status(404)
      return handler({})
    } else if(data instanceof Left) {
      res.status(400)
      return handler(data.l)
    } else if(data instanceof Right) {
      return handler(data.r)
    } else if(data instanceof Some) {
      return handler(data.x)
    } else if(data == undefined) {
      res.status(204)
    } else {
      res.json(data)
    }
  }
  let resource = cb(req, res)
  if(isPromise(resource)) {
    resource.then(handler).done()
  } else {
    handler(resource)
  }
}

