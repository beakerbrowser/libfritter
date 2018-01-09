const newID = require('monotonic-timestamp-base36')
const {toUrl, urlSlug, normalizeUrl, toArchiveOrigin} = require('./util')

// exported api
// =

class LibFritterFeedAPI {
  constructor (libfritter) {
    this.libfritter = libfritter
    this.db = libfritter.db
  }

  async post (archive, {text, threadRoot, threadParent}) {
    const archiveUrl = toArchiveOrigin(archive)
    const createdAt = Date.now()
    const url = `${archiveUrl}/posts/${newID()}.json`
    await this.db.posts.put(url, {text, threadRoot, threadParent, createdAt})
    return url
  }

  async vote (archive, {vote, subject}) {
    const archiveUrl = toArchiveOrigin(archive)
    if (subject && subject.getRecordURL) subject = subject.getRecordURL()
    if (subject && subject.url) subject = subject.url
    const createdAt = Date.now()
    const url = `${archiveUrl}/votes/${urlSlug(subject)}.json`
    await this.db.votes.put(url, {vote, subject, createdAt})
    return url
  }

  getPostsQuery ({author, authors, rootPostsOnly, after, before, offset, limit, reverse} = {}) {
    var query = this.db.posts
    if (author) {
      author = toArchiveOrigin(author)
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
    if (rootPostsOnly || authors) {
      query = query.filter(post => {
        if (rootPostsOnly && post.threadParent) return false
        if (authors && !authors.includes(post.getRecordOrigin())) return false
        return true
      })
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

    // count replies
    if (opts.countReplies) {
      promises = promises.concat(posts.map(async b => {
        b.replies = await this.countPosts({}, this.getRepliesQuery(b.getRecordURL()))
      }))
    }

    await Promise.all(promises)
    return posts
  }

  countPosts (opts, query) {
    query = query || this.getPostsQuery(opts)
    return query.count()
  }

  async getPost (record, query={}) {
    const recordUrl = toUrl(record)
    record = await this.db.posts.get(recordUrl)
    if (!record) return null
    record.author = await this.libfritter.social.getProfile(record.getRecordOrigin())
    record.votes = await this.countVotesFor(record.getRecordURL())
    return record
  }

  async getThread (record, query={}) {
    const recordUrl = toUrl(record)
    record = await this.db.posts.get(recordUrl)
    if (!record) return null

    // fetch the full thread
    const threadPosts = await this.listPosts({fetchAuthor: true, countVotes: true}, this.getRepliesQuery(record.threadRoot || recordUrl))

    // convert to map for fast lookup
    const threadPostsMap = {}
    threadPosts.forEach(post => threadPostsMap[post.getRecordURL()] = post)

    // add the root message to the map
    const rootPost = (record.threadRoot) ? await this.db.posts.get(record.threadRoot) : record
    if (rootPost) {
      rootPost.author = await this.libfritter.social.getProfile(rootPost.getRecordOrigin())
      rootPost.votes = await this.countVotesFor(rootPost.getRecordURL())
      threadPostsMap[rootPost.getRecordURL()] = rootPost
    }

    // make sure the authors filter includes the record and root authors
    if (query.authors) {
      if (!query.authors.includes(rootPost.getRecordOrigin())) {
        query.authors.push(rootPost.getRecordOrigin())
      }
      if (!query.authors.includes(record.getRecordOrigin())) {
        query.authors.push(record.getRecordOrigin())
      }
    }

    // convert the map's nodes into a tree structure
    for (let url in threadPostsMap) {
      let post = threadPostsMap[url]

      // apply filter
      if (query.authors && !query.authors.includes(post.getRecordOrigin())) {
        continue
      }

      // map
      if (post.threadParent && post.threadParent in threadPostsMap) {
        let parent = threadPostsMap[post.threadParent]
        post.parent = parent
        post.root = rootPost
        parent.replies = parent.replies || []
        parent.replies.push(post)
      }
    }

    // return the target record
    return threadPostsMap[recordUrl]
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