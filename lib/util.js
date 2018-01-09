const slugifyUrl = require('slugify-url')
const URL = (typeof window === 'undefined') ? require('url-parse') : window.URL
exports.URL = URL

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

exports.toArchiveOrigin = function (v) {
  if (v) {
    if (typeof v.getRecordOrigin === 'function') {
      return v.getRecordOrigin()
    }
    if (typeof v.url === 'string') {
      v = v.url
    }
    const urlp = new URL(v)
    return urlp.protocol + '//' + urlp.hostname
  }
  throw new Error('Not a valid archive')
}

exports.urlSlug = function (v) {
  v = exports.toUrl(v)
  return slugifyUrl(v, {skipProtocol: false})
}

exports.normalizeUrl = function (v) {
  const urlp = new URL(v)
  if (urlp.pathname === '/') urlp.pathname = ''
  return urlp.protocol + '//' + urlp.hostname + urlp.pathname + (urlp.search || '')
}