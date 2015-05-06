/* -*- mode: javascript -*- */
import express from 'express'
import bodyParser from 'body-parser'
import orm from 'orm'
import Q from 'q'
import {Namespace, Resource, URI, Class, Prefix, Property} from 'jsonld-dsl'
import {Map, List, Set} from 'immutable'
import {Some, None} from 'fantasy-options'
const config = Object.freeze({
  DB_URI: process.env.DB_URI,
  PORT: process.env.PORT || '5000'
})

/**************/
/* DB helpers */
/*************/
const arrayToOption = x => x.length ? Some(x[0]) : None

const DB = {
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


/**************/
/* Namespaces */
/*************/
const hydra = Namespace(
    Class('Class')
  , Property('required')
  , Property('property')
  , Class('SupportedProperty')
  , Property('supportedProperty')
  , Property('expects')
  , Property('statusCodes')
  , Class('Collection')
  , Property('member')
  , Property('operation')
  , Property('method')
  , Class('Operation')
)


const schema = Namespace(
    Class('WebPage')
  , Property('name')
  , Property('url')
)


const xhtml = Namespace(
  Property('up')
)
  
const operationFactory =
      (method) =>
      (...properties) => hydra.operation(
        Set.of(
          hydra.Operation(
            hydra.method(method),
            ...properties
          )
        )
      )
export const PUT = operationFactory('PUT')
export const POST = operationFactory('POST')
export const DELETE = operationFactory('DELETE')

/*************/
/* Resources */
/*************/

const contextResource = Resource(
    Prefix('schema', 'http://schema.org/', schema)
  , Prefix('hydra', 'http://www.w3.org/ns/hydra/core#', hydra)
  , Prefix('xhtml', 'http://www.w3.org/1999/xhtml#', xhtml)
)

const bookmarkForm = schema.WebPage(
  hydra.supportedProperty(
    [
      hydra.SupportedProperty(
        hydra.property('name'),
        hydra.required(true)
      ),
      
      hydra.SupportedProperty(
        hydra.property('url'),
        hydra.required(true)
      )
    ]
  )
)

// Returns a List of error strings
const validateBookmarkForm = data => {
  let validateName = name => !name ? List.of(".name undefined") : List()
  let validateURL = url => !url ? List.of(".url undefined") : List()
  if(!data) {
    return Map({
      errors: List.of('form is undefined')
    })
    
  } else {
    return Map({
      errors: validateName(data.name).merge(
        validateURL(data.url)
      )
    })
  }
}

const bookmarkResource = (root, bookmark) => schema.WebPage(
    URI(root + '/' + bookmark.id)
  , PUT(hydra.expects(bookmarkForm), hydra.statusCodes([201, 400]))
  , DELETE(hydra.statusCodes([201]))
  , xhtml.up(URI(root + '/'))
  , bookmark
)

const indexResource = (root, members) => hydra.Collection(
    URI(root + '/')
  , POST(hydra.expects(bookmarkForm), hydra.statusCodes([303, 400]))
  , hydra.member(List(members))
)


/****************/
/* View helpers */
/****************/

const HTTP = {
  root: req => req.protocol + '://' + req.get('Host'),

  // If the form validates, i.e. an empty errors value
  // call onOk with the form
  statusWhenValid: validate => onOk => (req, res) => {
    let form = req.body
    let validation = validate(form)
    if(validation.get('errors').size) {
      res.status(400).json(validation)
    } else {
      return onOk(req, res, form)
    }    
  },

  // Returns a 404 if the option is empty otherwise calls onSome with
  // the contained value
  notFoundOnNone: res => onSome => option => {
    if(option == None) {
      res.status(404).send('')
    } else {
      onSome(option.getOrElse(null))
    }
  }

}


/*********/
/* Views */
/*********/
const app = express()
app.use(bodyParser.json())
app.use(orm.express(config.DB_URI, {
  define: (db, models, next) => {
    models.bookmark = db.define('bookmark', {
      name: String,
      url: String
    })
    db.sync()
    next()
  }
}))


/******************/
/* Index resource */
/******************/
app.get(
  '/', (req, res) => {
    DB.all(req.models.bookmark).then(
      // Map the bookmarks to WebPage resources
      x => {
        let root = HTTP.root(req)
        res.json(
          indexResource(root, x.map(x => bookmarkResource(root, x))).merge(contextResource)
        )
      }
    ).done()
  })


app.post(
  '/', HTTP.statusWhenValid(validateBookmarkForm)(
    (req, res, form) => DB.post(req.models.bookmark, form).then(
      bookmark => {
        res.location('/' + bookmark.id).status(303).send('')
      }
    ).done()
  )
)


/*********************/
/* Bookmark Resource */
/*********************/
app.get(
  '/:id',
  (req, res) => 
    DB.get(
      req.models.bookmark, req.params.id
    ).then(
      option => option.map(x => bookmarkResource(HTTP.root(req), x))
    ).then(
      HTTP.notFoundOnNone(res)(
        data => res.status(200).json(data.merge(contextResource))
      )
    ).done()
)

app.put(
  '/:id', HTTP.statusWhenValid(validateBookmarkForm)(
    (req, res, form) =>
      DB.put(req.models.bookmark, req.params.id, form).then(
        HTTP.notFoundOnNone(res)(
          data => res.status(204).send('')
        )
      ).done()
  )
)

app.delete(
  '/:id', (req, res) =>
    DB.delete(req.models.bookmark, req.params.id).then(
      HTTP.notFoundOnNone(res)(
        data => res.status(204).send('')
      )
    ).done()
)

console.dir(config.PORT)
var server = app.listen(config.PORT, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
