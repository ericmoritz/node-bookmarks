/* -*- mode: javascript -*- */
import DB from './db'
import {hydra, schema, xhtml, POST, PUT, DELETE} from './namespaces'
import {Map, Set, List} from 'immutable'
import {Resource, Prefix, URI} from 'jsonld-dsl'
import {Left, Right} from 'fantasy-eithers'

const toNull = (...args) => null

/*************/
/* Resources */
/*************/
export const contextResource = Resource(
  Prefix('schema', 'http://schema.org/', schema),
  Prefix('hydra', 'http://www.w3.org/ns/hydra/core#', hydra),
  Prefix('xhtml', 'http://www.w3.org/1999/xhtml#', xhtml)
)

export const Index = {
  GET: (root, bookmarkModel) =>
    DB.all(bookmarkModel).then(
      bookmarks => RootResource(root)(
        IndexResource(root)(
          bookmarks.map(BookmarkResource(root))
        )
      )
    ),

  POST: (root, bookmarkModel, body) =>
    validateBookmarkForm(body).bimap(
      errors => RootResource(root)(
        schema.error(errors),
        IndexResource(root)
      ),
      form => DB.post(
        bookmarkModel, form
      ).then(
        bookmark => RootResource(root)(
          BookmarkResource(root)(bookmark)
        )
      )
    )
}

export const Bookmark = {
  GET: (root, bookmarkModel, id) =>
    DB.get(
      bookmarkModel, id
    ).then(
      option => option.map(
        bookmark => RootResource(root)(
          BookmarkResource(root)(bookmark))
      )
    ),
  PUT: (root, bookmarkModel, id, body) =>
    validateBookmarkForm(body)
    .bimap(
      errors => RootResource(
        schema.error(errors)
      ),
      form => DB.put(
        bookmarkModel, id, body
      ).then(
        option => option.map(toNull)
      )
    ),
  DELETE: (root, bookmarkModel, id) =>
    DB.delete(
      bookmarkModel, id
    ).then(
      option => option.map(toNull)
    )
}


const contextLink = root => Map(
  {'@context': root + '/context.json'}
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



// Returns a Left<Set<Resource>> if there are errors or Right(data) if valid
const validateBookmarkForm = data => {
  let errorResource = description => Resource(schema.description(description))
  let nameErrors = !data.name ? Set.of(errorResource(".name undefined")) : Set()
  let urlErrors = !data.url ? Set.of(errorResource(".url undefined")) : Set()
  let errors = nameErrors.union(urlErrors)
  return !errors.isEmpty()
    ? Left(errors)
    : Right(data)
}

const RootResource = root => (...args) => Resource(
  contextLink(root),
    ...args
)

const BookmarkResource = root => bookmark => schema.WebPage(
  URI(root + '/' + bookmark.id),
  PUT(hydra.expects(bookmarkForm), hydra.statusCodes([201, 400])),
  DELETE(hydra.statusCodes([201])),
  xhtml.up(URI(root + '/')),
  bookmark
)

const IndexResource = root => members => hydra.Collection(
  URI(root + '/'),
  POST(hydra.expects(bookmarkForm), hydra.statusCodes([303, 400])),
  hydra.member(List(members))
)
