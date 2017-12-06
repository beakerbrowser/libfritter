# libfritter

Data definitions and methods for Fritter, a dat-based Twitter clone.
Uses [WebDB](https://github.com/beakerbrowser/webdb) to read and write records on the [Dat](https://datproject.org) network.

Example setup in Beaker:

```js
const LibFritter = require('@beaker/libfritter')
const fritter = new LibFritter('fritter')
fritter.open().then(/* ready */)
```

API:

```js
// setup / management
// =

const fritter = new LibFritter(nameOrPath, {
  DatArchive: optional, constructor for dats (used in node)
})
await fritter.open() // wait for webdb to initialize
await fritter.close()
await fritter.addSource(archive)
await fritter.removeSource(archive)

// profile data
// =

await fritter.social.getProfile(archive) // => {name:, bio:, avatar:}
await fritter.social.setProfile(archive, {name:, bio:})
await fritter.social.setAvatar(archive, imgDataBuffer, extension)

// social relationships
// =

await fritter.social.follow(archive, targetUser, targetUserName?)
await fritter.social.unfollow(archive, targetUser)

await fritter.social.listFollowers(archive) // list users in db that follow the user
await fritter.social.countFollowers(archive) // count users in db that follow the user
await fritter.social.listFriends(archive) // list users in db that mutually follow the user
await fritter.social.countFriends(archive) // count users in db that mutually follow the user

await fritter.social.isFollowing(archiveA, archiveB) // => true
await fritter.social.isFriendsWith(archiveA, archiveB) // => true

// posting to the feed
// =

await fritter.feed.post(archive, {
  text: 'Hello, world!',
})

// posting a reply
await fritter.feed.post(archive, {
  text: 'Hello, world!',
  threadParent: parent.getRecordURL(), // url of message replying to
  threadRoot: root.getRecordURL() // url of topmost ancestor message
})

// reading the feed
// =

// get post records
await fritter.feed.listPosts({
  author?: url | DatArchive,
  rootPostsOnly: boolean, remove posts in the feed that are replies
  after: timestamp,
  before: timestamp,
  offset: number,
  limit: number,
  reverse: boolean,
  fetchAuthor: boolean,
  fetchReplies: boolean,
  countVotes: boolean
})

await fritter.feed.countPosts(/* same opts for listPosts */)
await fritter.feed.getPost(url)

// votes
// =

await fritter.feed.vote(archive, {
  vote: number (-1, 0, or 1),
  subject: string (a url)
})

await fritter.feed.listVotesFor(subject)

// this returns {up: number, down: number, value: number, upVoters: array of urls, currentUsersVote: number}
async fritter.feed.countVotesFor(subject)
```

