'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
  value: true
});
/* -*- mode: javascript -*- */

var _express = require('express');

var _express2 = _interopRequireWildcard(_express);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireWildcard(_bodyParser);

var _orm = require('orm');

var _orm2 = _interopRequireWildcard(_orm);

var _Q = require('q');

var _Q2 = _interopRequireWildcard(_Q);

var _Namespace$Resource$URI$Class$Property = require('jsonld-dsl');

var config = Object.freeze({
  DB_URI: process.env.DB_URI,
  PORT: new Number(process.env.PORT || '8000')
});

/**************/
/* DB helpers */
/*************/
var arrayToOption = function arrayToOption(x) {
  return x.length ? Some(x[0]) : None;
};

var DB = {
  all: function all(model) {
    return _Q2['default'].ninvoke(model, 'find');
  },
  get: function get(model, id) {
    return _Q2['default'].ninvoke(model, 'find', { id: id }).then(arrayToOption);
  },
  put: function put(model, id, data) {
    return this.get(model, id).then(function (option) {
      return option.map(function (x) {
        return x.save(data);
      });
    });
  },
  'delete': function _delete(model, id) {
    return this.get(model, id).then(function (option) {
      return option.map(function (x) {
        return x['delete'];
      });
    });
  } };

/**************/
/* Namespaces */
/*************/
var hydra = _Namespace$Resource$URI$Class$Property.Namespace(_Namespace$Resource$URI$Class$Property.Class('Class'), _Namespace$Resource$URI$Class$Property.Property('required'), _Namespace$Resource$URI$Class$Property.Property('property'), _Namespace$Resource$URI$Class$Property.Class('SupportedProperty'), _Namespace$Resource$URI$Class$Property.Property('supportedProperty'), _Namespace$Resource$URI$Class$Property.Property('expects'), _Namespace$Resource$URI$Class$Property.Class('Collection'), _Namespace$Resource$URI$Class$Property.Property('member'), _Namespace$Resource$URI$Class$Property.Property('operation'), _Namespace$Resource$URI$Class$Property.Property('method'), _Namespace$Resource$URI$Class$Property.Class('Operation'));

var schema = _Namespace$Resource$URI$Class$Property.Namespace(_Namespace$Resource$URI$Class$Property.Class('WebPage'), _Namespace$Resource$URI$Class$Property.Property('name'), _Namespace$Resource$URI$Class$Property.Property('url'));

var xhtml = _Namespace$Resource$URI$Class$Property.Namespace(_Namespace$Resource$URI$Class$Property.Property('up'));

var operationFactory = function operationFactory(method) {
  return function () {
    for (var _len = arguments.length, properties = Array(_len), _key = 0; _key < _len; _key++) {
      properties[_key] = arguments[_key];
    }

    return hydra.operation(Set.of(hydra.Operation.apply(hydra, [hydra.method(method)].concat(properties))));
  };
};
var PUT = operationFactory('PUT');
exports.PUT = PUT;
var POST = operationFactory('POST');
exports.POST = POST;
var DELETE = operationFactory('DELETE');

exports.DELETE = DELETE;
/*************/
/* Resources */
/*************/

var contextResource = _Namespace$Resource$URI$Class$Property.Resource(Prefix('schema', 'http://schema.org/', schema), Prefix('hydra', 'http://www.w3.org/ns/hydra/core#', hydra), Prefix('xhtml', 'http://www.w3.org/1999/xhtml#', xhtml));

var bookmarkForm = hydra.WebPage(hydra.supportedProperty([hydra.SupportedProperty(hydra.property('name'), hydra.required(true)), hydra.SupportedProperty(hydra.property('url'), hydra.required(true))]));

// Returns a List of error strings
var validateBookmarkForm = function validateBookmarkForm(data) {
  var validateName = function validateName(name) {
    return !name ? List('.name undefined') : List();
  };
  var vaiidateURL = function vaiidateURL(url) {
    return !url ? List('.url undefined') : List();
  };
  return Map({
    errors: validateName(data.name).merge(validateURL(data.url))
  });
};

var bookmarkResource = function bookmarkResource(bookmark) {
  return schema.WebPage(_Namespace$Resource$URI$Class$Property.URI('/' + bookmark.id), PUT(hydra.expects(bookmarkForm), hydra.statusCodes([201, 400])), DELETE(hydra.statusCodes([201])), xhtml.up(URL('/')), bookmark);
};

var indexResource = function indexResource(members) {
  return hydra.Collection(_Namespace$Resource$URI$Class$Property.URI('/'), POST(hydra.expects(bookmarkForm), hydra.statusCodes([303, 400])), hydra.member(List(members)));
};

/****************/
/* View helpers */
/****************/

var HTTP = {
  // If the form validates, i.e. an empty errors value
  // call onOk with the form
  statusWhenValid: function statusWhenValid(validate) {
    return function (onOk) {
      return function (res, req) {
        var form = req.body;
        var validation = validation(form);
        if (validation.get('errors').size) {
          res.status(400).json(validation);
        } else {
          onOk(res, req, form);
        }
      };
    };
  },

  // Returns a 404 if the option is empty otherwise calls onSome with
  // the contained value
  notFoundOnNone: function notFoundOnNone(res) {
    return function (onSome) {
      return function (option) {
        if (option.empty()) {
          res.status(404);
        } else {
          onSome(option.getOrElse(null));
        }
      };
    };
  }

};

/*********/
/* Views */
/*********/
var app = _express2['default']();
app.use(_bodyParser2['default'].json());
app.use(_orm2['default'].express(config.DB_URI, {
  define: function define(db, models, next) {
    models.bookmark = db.define('bookmark', {
      name: String,
      url: String
    });
    next();
  }
}));

/******************/
/* Index resource */
/******************/
app.get('/', function (req, res) {
  DB.find(req.models.bookmark).then(
  // Map the bookmarks to WebPage resources
  function (x) {
    res.json(IndexResource(x.map(BookmarkResource)));
  }).done();
});

app.post('/', HTTP.statusWhenValid(validateBookmarkForm)(function (req, res, form) {
  return DB.save(req.models.bookmark, form).then(function (bookmark) {
    return res.location('/' + bookmark.id).status(303);
  }).done();
}));

/*********************/
/* Bookmark Resource */
/*********************/
app.get('/:id', function (req, res) {
  return DB.get(req.models.bookmark, req.params.id).then(function (option) {
    return option.map(bookmarkResource);
  }).then(HTTP.notFoundOnNone(res)(function (data) {
    return res.status(200).json(data);
  }));
});

app.put('/:id', HTTP.statusWhenValid(validateBookmarkForm)(function (req, res, form) {
  return DB.put(req.models.bookmark, req.params.id, form).then(HTTP.notFoundOnNone(res)(function (data) {
    return res.status(201);
  }));
}));

app['delete']('/:id', function (req, res) {
  return DB['delete'](req.models.bookmark, req.params.id).then(HTTP.notFoundOnNone(res)(function (data) {
    return res.status(201);
  }));
});

app.listen(config.PORT);
