/* -*- mode: javascript -*- */
import DB from './db'
import {hydra, schema, xhtml, POST, PUT, DELETE} from './namespaces'
import {Map, Set, List} from 'immutable'
import {Resource, Prefix, URI} from 'jsonld-dsl'
import {Left, Right} from 'fantasy-eithers'


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
      x => Resource(
        contextLink(root),
        IndexResource(root, x.map(x => BookmarkResource(root, x)))
      )
    ),

  POST: (root, bookmarkModel, body) =>
    validateBookmarkForm(body).bimap(
      errors => Resource(
        contextLink(root),
        schema.error(errors),
        IndexResource(root)
      ),
      form => DB.post(
        bookmarkModel, form
      ).then(
        bookmark => Resource(
          contextLink(root),
          BookmarkResource(root, bookmark)
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
          x => Resource(
            BookmarkResource(root, x)),
            contextLink(root)
          )
      ),
  PUT: (root, bookmarkModel, id, body) =>
     validateBookmarkForm(body)
      .bimap(
        errors => Resource(
          contextLink(root),
          schema.error(errors)
        ),
        form => DB.put(
          bookmarkModel, id, body
        ).then(
          option => option.map(x => null)
        )
      ),
  DELETE: (root, bookmarkModel, id) =>
    DB.delete(
      bookmarkModel, id
    ).then(
      option => option.map(x => null)
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

const errorResource = description => Resource(
  schema.description(description)
)


// Returns a Left<Set<Resource>> if there are errors or Right(data) if valid
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

const BookmarkResource = (root, bookmark) => schema.WebPage(
  URI(root + '/' + bookmark.id),
  PUT(hydra.expects(bookmarkForm), hydra.statusCodes([201, 400])),
  DELETE(hydra.statusCodes([201])),
  xhtml.up(URI(root + '/')),
  bookmark
)

const IndexResource = (root, members) => hydra.Collection(
  URI(root + '/'),
  POST(hydra.expects(bookmarkForm), hydra.statusCodes([303, 400])),
  hydra.member(List(members))
)



