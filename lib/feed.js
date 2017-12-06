const newID = require('monotonic-timestamp-base36')
const {toUrl, urlSlug, normalizeUrl} = require('./util')

// exported api
// =

class LibFritterFeedAPI {
  constructor (libfritter) {
    this.libfritter = libfritter
    this.db = libfritter.db
  }

  post (archive, {text, threadRoot, threadParent}) {
    const archiveUrl = toUrl(archive)
    const createdAt = Date.now()
    return this.db.posts.put(`${archiveUrl}/posts/${newID()}.json`, {text, threadRoot, threadParent, createdAt})
  }

  vote (archive, {vote, subject}) {
    const archiveUrl = toUrl(archive)
    if (subject && subject.getRecordURL) subject = subject.getRecordURL()
    if (subject && subject.url) subject = subject.url
    const createdAt = Date.now()
    return this.db.votes.put(`${archiveUrl}/votes/${urlSlug(subject)}.json`, {vote, subject, createdAt})
  }

  getPostsQuery ({author, rootPostsOnly, after, before, offset, limit, reverse} = {}) {
    var query = this.db.posts
    if (author) {
      author = toUrl(author)
      after = after || 0
      before = before || Infinity
      query = query.where(':origin+createdAt').between([author, after], [author, before])
    } else if (after || before) {
      after = after || 0
      before = before || Infinity
      query = query.where('createdAt').between(after, before)
    } else {
      query = query.orderBy('createdAt')
    }
    if (rootPostsOnly) {
      query = query.filter(post => !post.threadParent)
    }
    if (offset) query = query.offset(offset)
    if (limit) query = query.limit(limit)
    if (reverse) query = query.reverse()
    return query
  }

  getRepliesQuery (threadRootUrl, {offset, limit, reverse} = {}) {
    var query = this.db.posts.where('threadRoot').equals(threadRootUrl)
    if (offset) query = query.offset(offset)
    if (limit) query = query.limit(limit)
    if (reverse) query = query.reverse()
    return query
  }

  async listPosts (opts = {}, query) {
    var promises = []
    query = query || this.getPostsQuery(opts)
    var posts = await query.toArray()

    // fetch author profile
    if (opts.fetchAuthor) {
      let profiles = {}
      promises = promises.concat(posts.map(async b => {
        if (!profiles[b.getRecordOrigin()]) {
          profiles[b.getRecordOrigin()] = this.libfritter.social.getProfile(b.getRecordOrigin())
        }
        b.author = await profiles[b.getRecordOrigin()]
      }))
    }

    // tabulate votes
    if (opts.countVotes) {
      promises = promises.concat(posts.map(async b => {
        b.votes = await this.countVotesFor(b.getRecordURL())
      }))
    }

    // fetch replies
    if (opts.fetchReplies) {
      promises = promises.concat(posts.map(async b => {
        b.replies = await this.listPosts({fetchAuthor: true, countVotes: opts.countVotes}, this.getRepliesQuery(b.getRecordURL()))
      }))
    }

    await Promise.all(promises)
    return posts
  }

  countPosts (opts, query) {
    query = query || this.getPostsQuery(opts)
    return query.count()
  }

  async getThread (record) {
    const recordUrl = toUrl(record)
    record = await this.db.posts.get(recordUrl)
    if (!record) return null
    record.author = await this.libfritter.social.getProfile(record.getRecordOrigin())
    record.votes = await this.countVotesFor(recordUrl)
    record.replies = await this.listPosts({fetchAuthor: true, countVotes: true}, this.getRepliesQuery(recordUrl))
    return record
  }

  getVotesForQuery (subject) {
    return this.db.votes.where('subject').equals(normalizeUrl(toUrl(subject)))
  }

  listVotesFor (subject) {
    return this.getVotesForQuery(subject).toArray()
  }

  async countVotesFor (subject) {
    var res = {up: 0, down: 0, value: 0, upVoters: []}
    await this.getVotesForQuery(subject).each(record => {
      res.value += record.vote
      if (record.vote === 1) {
        res.upVoters.push(record.getRecordOrigin())
        res.up++
      }
      if (record.vote === -1) {
        res.down++
      }
    })
    return res
  }
}

module.exports = LibFritterFeedAPI