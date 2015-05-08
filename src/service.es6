/* -*- mode: javascript -*- */
import express from 'express'
import expressPromises from 'express-promise'
import bodyParser from 'body-parser'
import orm from 'orm'
import ExpressResource from './express-resource'
import * as resources from './resources'

const config = Object.freeze({
  DB_URI: process.env.DB_URI,
  PORT: process.env.PORT || '5000'
})

const trace = (msg, x) => {
  console.log(msg, x)
  return x
}
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
  '/context.json', ExpressResource((req, res) => contextResource)
)


/******************/
/* Index resource */
/******************/
app.get(
  '/', ExpressResource(
    (req, res) =>
      resources.Index.GET(
        HTTP.root(req),
        req.models.bookmark
      )
  )
)


app.post(
  '/', ExpressResource(
    (req, res) => resources.Index.POST(
      HTTP.root(req),
      req.models.bookmark,
      req.body
    )
  )
)
        

/*********************/
/* Bookmark Resource */
/*********************/
app.get(
  '/:id',
  ExpressResource(
    (req, res) => resources.Bookmark.GET(
      HTTP.root(req),
      req.models.bookmark,
      req.params.id
    )
  )
)


app.put(
  '/:id', 
  ExpressResource(
    (req, res) => resources.Bookmark.PUT(
      HTTP.root(req),
      req.models.bookmark,
      req.params.id,
      req.body
    )
  )
)


app.delete(
  '/:id', ExpressResource(
    (req, res) =>
      resources.Bookmark.DELETE(
        HTTP.root(req),
        req.models.bookmark,
        req.params.id
      )
  )
)

var server = app.listen(config.PORT, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
