/* -*- mode: javascript -*- */
import {Namespace, Resource, URI, Class, Prefix, Property, hydra as hydraNS} from 'jsonld-dsl'
import {Set} from 'immutable'

/**************/
/* Namespaces */
/*************/
export const hydra = Namespace(
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


export const schema = Namespace(
  Property('error'),
  Class('Thing'),
  Class('WebPage'),
  Property('name'),
  Property('url'),
  Property('description')
)


export const xhtml = Namespace(
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
