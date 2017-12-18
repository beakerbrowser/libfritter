const WebDB = require('@beaker/webdb')
const LibFritterSocialAPI = require('./lib/social')
const LibFritterFeedAPI = require('./lib/feed')
const {normalizeUrl} = require('./lib/util')

const SCHEMAS = {
  post: require('./schemas/post.json'),
  profile: require('./schemas/profile.json'),
  vote: require('./schemas/vote.json')
}

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
    schema: SCHEMAS.profile,
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
    schema: SCHEMAS.post
  })

  db.define('votes', {
    filePattern: '/votes/*.json',
    index: ['subject'],
    schema: SCHEMAS.vote,
    preprocess (record) {
      record.subject = normalizeUrl(record.subject)
    }
  })
}


