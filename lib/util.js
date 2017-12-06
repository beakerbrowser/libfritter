const slugifyUrl = require('slugify-url')
const normalizeUrl = require('normalize-url')

const NORMALIZE_OPTS = {
  stripFragment: false,
  stripWWW: false,
  removeQueryParameters: false
}

exports.toUrl = function (v) {
  if (v) {
    if (typeof v === 'string') {
      return v
    }
    if (typeof v.getRecordURL === 'function') {
      return v.getRecordURL()
    }
    if (typeof v.url === 'string') {
      return v.url
    }
  }
}

exports.urlSlug = function (v) {
  v = exports.toUrl(v)
  return slugifyUrl(v, {skipProtocol: false})
}

exports.normalizeUrl = function (v) {
  return normalizeUrl(v, NORMALIZE_OPTS)
}