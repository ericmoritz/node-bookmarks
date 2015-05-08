/* -*- mode: javascript -*- */
import Q from 'q'
import {Some, None} from 'fantasy-options'


/**************/
/* DB helpers */
/*************/
const arrayToOption = x => x.length ? Some(x[0]) : None

export default {
  all(model) { return Q.ninvoke(model, 'find') },
  get(model, id) {
    return Q.ninvoke(model, 'find', {'id': id}).then(
      r => {
        return arrayToOption(r)
      }
    )
  },
  post(model, data) {
    return Q.ninvoke(model, 'create', data)
  },
  put(model, id, data) { return this.get(model, id).then(option => option.map(x => x.save(data))) },
  delete(model, id) {
    return this.get(model, id).
      then(option => option.map(x => x.remove()))
  },
}

