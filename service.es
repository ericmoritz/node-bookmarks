/* -*- mode: javascript -*- */
import express from 'express'
import expressPromises from 'express-promise'
import bodyParser from 'body-parser'
import orm from 'orm'
import Q from 'q'
import {Namespace, Resource, URI, Class, Prefix, Property, hydra as hydraNS} from 'jsonld-dsl'
import {Map, List, Set} from 'immutable'
import {Left, Right} from 'fantasy-eithers'
import {Some, None} from 'fantasy-options'
import ExpressResource from './express-resource'
const config = Object.freeze({
  DB_URI: process.env.DB_URI,
  PORT: process.env.PORT || '5000'
})

const trace = (msg, x) => {
  console.log(msg, x)
  return x
}
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
const ns = Namespace(
  Property('bookmarkLink')
)

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
  Property('error'),
  Class('Thing'),
  Class('WebPage'),
  Property('name'),
  Property('url'),
  Property('description')
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
const contextLink = (root) => Map(
  {'@context': root + '/context.json'}
)
const context = contextResource

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

const errorResource = (description) => Resource(
  schema.description(description)
)


// Returns a List of error strings
const validateBookmarkForm = data => {
  let nameErrors = !data.name ? Set.of(errorResource(".name undefined")) : Set()
  let urlErrors = !data.url ? Set.of(errorResource(".url undefined")) : Set()
  let errors = nameErrors.union(urlErrors)
  if(!errors.isEmpty()) {
    return Left(errors)
  } else {
    return Right(data)
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
  seeOther: (res, resource) => {
    res.location(resource.get('@id'))
    res.status(303)
    return resource
  },
  root: req => req.protocol + '://' + req.get('Host'),
}


/*********/
/* Views */
/*********/
const app = express()
app.use(bodyParser.json())
app.use(expressPromises())
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


// Context resource
app.get(
  '/context.json', (req, res) => { res.json(contextResource) }
)

/******************/
/* Index resource */
/******************/
app.get(
  '/', ExpressResource(
    (req, res) => DB.all(req.models.bookmark).then(
      x => {
        let root = HTTP.root(req)
        return Resource(
          contextResource,
          indexResource(root, x.map(x => bookmarkResource(root, x)))
        )
      }
    )
  )
)


app.post(
  '/', ExpressResource(
    (req, res) =>
      validateBookmarkForm(req.body)
      .bimap(
        errors => Resource(
          contextResource,
          schema.error(errors),
          indexResource(HTTP.root(res))
        ),

        form => DB.post(
          req.models.bookmark, form
        ).then(
          bookmark => Resource(
              contextResource,
              bookmarkResource(HTTP.root(req), bookmark)
            )
        )
      )
  )
)
        

/*********************/
/* Bookmark Resource */
/*********************/
app.get(
  '/:id',
  ExpressResource(
    (req, res) => 
      DB.get(
        req.models.bookmark, req.params.id
      ).then(
        option => option.map(
          x => Resource(
            bookmarkResource(HTTP.root(req), x)),
            contextResource
          )
      )
  )
)


app.put(
  '/:id', 
  ExpressResource(
    (req, res) =>
      validateBookmarkForm(req.body)
      .bimap(
        errors => Resource(
          contextResource,
          schema.error(errors)
        ),
        form => DB.put(req.models.bookmark, req.params.id, form).then(
          option => option.map(x => null)
        )
      )
  )
)


app.delete(
  '/:id', ExpressResource(
    (req, res) =>
      DB.delete(
        req.models.bookmark, req.params.id
      ).then(
        option => option.map(x => null)
      )
  )
)


console.dir(config.PORT)
var server = app.listen(config.PORT, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
