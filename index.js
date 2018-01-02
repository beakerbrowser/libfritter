const WebDB = require('@beaker/webdb')
const assert = require('assert')
const LibFritterSocialAPI = require('./lib/social')
const LibFritterFeedAPI = require('./lib/feed')
const {normalizeUrl} = require('./lib/util')

// exported API
// =

class LibFritter {
  constructor (opts = {}) {
    this.db = new WebDB(opts.mainIndex || 'fritter', {
      DatArchive: opts.DatArchive
    })
    defineTables(this.db)
    this.social = new LibFritterSocialAPI(this)
    this.feed = new LibFritterFeedAPI(this)
  }

  async prepareArchive (archive) {
    async function mkdir (path) {
      try { await archive.mkdir(path) } catch (e) {}
    }
    await mkdir('posts')
    await mkdir('votes')
  }
}

module.exports = LibFritter

// internal methods
// =


function defineTables (db) {
  db.define('profiles', {
    filePattern: '/profile.json',
    index: ['*followUrls'],
    validate (record) {
      if (record.name) assert(typeof record.name === 'string', 'The .name attribute must be a string')
      if (record.bio) assert(typeof record.bio === 'string', 'The .bio attribute must be a string')
      if (record.avatar) assert(typeof record.avatar === 'string', 'The .avatar attribute must be a string')
      if (record.follows) {
        assert(Array.isArray(record.follows), 'The .follows attribute must be an array')
        for (let i = 0; i < record.follows.length; i++) {
          assert(record.follows[i] && typeof record.follows[i] === 'object', 'Every value in the .follows array must be an object')
          assert(typeof record.follows[i].url === 'string', 'Every object in the .follows array must include a .url string')
          if (record.follows[i].name) assert(typeof record.follows[i].name === 'string', 'Every .name in the .follows objects must be a string')
        }
      }
      return true
    },
    preprocess (record) {
      record.follows = record.follows || []
      record.followUrls = record.follows.map(f => f.url)
    },
    serialize (record) {
      return {
        name: record.name,
        bio: record.bio,
        avatar: record.avatar,
        follows: record.follows
      }
    }
  })

  db.define('posts', {
    filePattern: '/posts/*.json',
    index: ['createdAt', ':origin+createdAt', 'threadRoot'],
    validate (record) {
      assert(typeof record.text === 'string', 'The .text attribute is required and must be a string')
      assert(typeof record.createdAt === 'number', 'The .createdAt attribute is required and must be a number')
      if (record.threadRoot) assert(typeof record.threadRoot === 'string', 'The .threadRoot attribute must be a string')
      if (record.threadParent) assert(typeof record.threadParent === 'string', 'The .threadRoot attribute must be a string')
      return true
    }
  })

  db.define('votes', {
    filePattern: '/votes/*.json',
    index: ['subject'],
    validate (record) {
      assert(typeof record.subject === 'string', 'The .subject attribute is required and must be a string')
      assert(record.vote === -1 || record.vote === 0 || record.vote === 1, 'The .vote attribute is required and must be a number of the value -1, 0, or 1')
      if (record.createdAt) assert(typeof record.createdAt === 'number', 'The .createdAt attribute must be a number')
      return true
    },
    preprocess (record) {
      record.subject = normalizeUrl(record.subject)
    }
  })
}


