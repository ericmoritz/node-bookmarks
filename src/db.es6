/* -*- mode: javascript -*- */
import Q from 'q'
import {Some, None} from 'fantasy-options'


/**************/
/* DB helpers */
/*************/
const arrayToOption = x => x.length ? Some(x[0]) : None

const DB = {
  all: (model) =>
    Q.ninvoke(model, 'find'),

  get: (model, id) =>
    Q.ninvoke(model, 'find', {'id': id}).then(
      r => arrayToOption(r)
    ),

  post: (model, data) =>
    Q.ninvoke(model, 'create', data),

  put: (model, id, data) =>
    DB.get(model, id).then(option => option.map(x => x.save(data))),

  delete: (model, id) =>
    DB.get(model, id).then(option => option.map(x => x.remove()))
}

export default DB


