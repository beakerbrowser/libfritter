const WebDB = require('@beaker/webdb')
const assert = require('assert')
const LibFritterSocialAPI = require('./lib/social')
const LibFritterFeedAPI = require('./lib/feed')
const LibFritterNotificationsAPI = require('./lib/notifications')
const {normalizeUrl, toArchiveOrigin} = require('./lib/util')

// exported API
// =

class LibFritter {
  constructor (opts = {}) {
    this.db = new WebDB(opts.mainIndex || 'fritter', {
      DatArchive: opts.DatArchive
    })
    defineTables(this.db)
    setHooks(this)
    this.userUrl = ''
    this.social = new LibFritterSocialAPI(this)
    this.feed = new LibFritterFeedAPI(this)
    this.notifications = new LibFritterNotificationsAPI(this)
  }

  setUser (user) {
    this.userUrl = toArchiveOrigin(user)
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
      record.followUrls = record.follows.map(f => toArchiveOrigin(f.url))
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

  db.define('notifications', {
    helperTable: true,
    index: ['createdAt'],
    preprocess (record) {
      record.createdAt = record.createdAt || Date.now()
    }
  })
}

function setHooks (inst) {
  const db = inst.db
  const consoleDebug = console.debug || console.log
  db.on('open-failed', err => console.error('Database failed to open.', err))
  db.on('indexes-reset', () => consoleDebug('Rebuilding indexes.'))

  function isAReplyToUser (record) {
    if (record.threadRoot && record.threadRoot.startsWith(inst.userUrl)) return true
    if (record.threadParent && record.threadParent.startsWith(inst.userUrl)) return true
    return false
  }

  function isALikeOnUserPost (record) {
    return record.subject.startsWith(inst.userUrl + '/posts/')
  }

  function isAMentionOfUser (record) {
    return record.hasOwnProperty('mentions') && !(record.mentions.find(x => {
      return x.url == inst.userUrl
    }) == undefined)
  }

  async function isNotificationIndexed (url) {
    let record = await db.notifications.get(url)
    return !!record
  }

  db.on('open', () => {
    consoleDebug('Database is opened.')

    // reply notifications
    db.posts.on('put-record', async ({record, url, origin}) => {
      if (origin === inst.userUrl) return // dont index the user's replies
      if (isAReplyToUser(record) === false) return // only index replies to the user
      if (await isNotificationIndexed(url)) return // don't index if already indexed
      await db.notifications.put(url, {type: 'reply', url, createdAt: record.createdAt})
    })
    db.posts.on('del-record', async ({url}) => {
      if (await isNotificationIndexed(url)) {
        await db.notifications.delete(url)
      }
    })

    // like notifications
    db.votes.on('put-record', async ({record, url, origin}) => {
      if (origin === inst.userUrl) return // dont index the user's votes
      if (isALikeOnUserPost(record) === false) return // only index votes on the user's posts
      if (record.vote === 1) {
        await db.notifications.put(url, {type: 'vote', vote: 1, subject: record.subject, origin, createdAt: record.createdAt})
      } else {
        await db.notifications.delete(url)
      }
    })
    db.votes.on('del-record', async ({url}) => {
      if (isNotificationIndexed(url)) {
        await db.notifications.delete(url)
      }
    })

    // mention notifications
    db.posts.on('put-record', async ({record, url, origin}) => {
      if (origin === inst.userUrl) return // dont index the user's self-mentions
      if (isAMentionOfUser(record) === false) return
      if (await isNotificationIndexed(url)) return // don't index if already indexed
      await db.notifications.put(url, {type: 'mention', url, createdAt: record.createdAt})
    })
  })
}
