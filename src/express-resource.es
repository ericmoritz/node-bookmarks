/* -*- mode: javascript -*- */
import {Left, Right} from 'fantasy-eithers'
import {Some, None} from 'fantasy-options'

const isPromise = v => v !== null && typeof v === 'object' && typeof v.then === 'function'

export default (cb) => (req, res) => {
  let handler = (data) => {
    if(isPromise(data)) {
      data.then(handler).done()
    } else if(data == None) {
      console.log('None')
      res.status(404)
      res.end()      
    } else if(data instanceof Left) {
      console.log('Left', data)
      res.status(400)
      return handler(data.l)
    } else if(data instanceof Right) {
      console.log('Right', data)
      return handler(data.r)
    } else if(data instanceof Some) {
      console.log('Some', data)
      return handler(data.x)
    } else if(data == undefined) {
      console.log('undefined')
      res.status(204)
      res.end()
    } else {
      console.log(data)
      res.json(data)
    }
  }
  handler(cb(req, res))
}


