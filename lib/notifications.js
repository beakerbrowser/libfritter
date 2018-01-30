const {toUrl, toArchiveOrigin} = require('./util')

// exported api
// =

class LibFritterNotificationsAPI {
  constructor (libfritter) {
    this.libfritter = libfritter
    this.db = libfritter.db
  }

  getNotificationsQuery ({after, before, offset, limit, reverse} = {}) {
    var query = this.db.notifications
    if (after || before) {
      after = after || 0
      before = before || Infinity
      query = query.where('createdAt').between(after, before)
    } else {
      query = query.orderBy('createdAt')
    }
    if (offset) query = query.offset(offset)
    if (limit) query = query.limit(limit)
    if (reverse) query = query.reverse()
    return query
  }

  async listNotifications (opts = {}) {
    var promises = []
    var notifications = await this.getNotificationsQuery(opts).toArray()

    // fetch author profile
    if (opts.fetchAuthor) {
      let profiles = {}
      promises = promises.concat(notifications.map(async n => {
        const origin = n.origin || toArchiveOrigin(n.url)
        if (!profiles[origin]) {
          profiles[origin] = this.libfritter.social.getProfile(origin)
        }
        n.author = await profiles[origin]
      }))
    }

    // fetch posts
    if (opts.fetchPost) {
      promises = promises.concat(notifications.map(async n => {
        if (n.type === 'reply' || n.type === 'mention') {
          n.post = await this.libfritter.feed.getPost(n.url)
        } else {
          n.post = await this.libfritter.feed.getPost(n.subject)
        }
      }))
    }

    await Promise.all(promises)
    return notifications
  }

  countNotifications (opts) {
    return this.getNotificationsQuery(opts).count()
  }
}

module.exports = LibFritterNotificationsAPI
