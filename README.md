# libfritter

Data definitions and methods for Fritter, a dat-based Twitter clone.
Uses [WebDB](https://github.com/beakerbrowser/webdb) to read and write records on the [Dat](https://datproject.org) network.

Example setup in Beaker:

```js
const LibFritter = require('@beaker/libfritter')
var libfritter = new LibFritter('fritter')
libfritter.open().then(/* ready */)
```

API:

```js
// setup / management
// =

var libfritter = new LibFritter(nameOrPath, {
  DatArchive: optional, constructor for dats (used in node)
})
await libfritter.open() // wait for webdb to initialize
await libfritter.close()
await libfritter.addSource(archive)
await libfritter.removeSource(archive)

// profile data
// =

await libfritter.social.getProfile(archive) // => {name:, bio:, avatar:}
await libfritter.social.setProfile(archive, {name:, bio:})
await libfritter.social.setAvatar(archive, imgDataBuffer, extension)

// social relationships
// =

await libfritter.social.follow(archive, targetUser, targetUserName?)
await libfritter.social.unfollow(archive, targetUser)

await libfritter.social.listFollowers(archive) // list users in db that follow the user
await libfritter.social.countFollowers(archive) // count users in db that follow the user
await libfritter.social.listFriends(archive) // list users in db that mutually follow the user
await libfritter.social.countFriends(archive) // count users in db that mutually follow the user

await libfritter.social.isFollowing(archiveA, archiveB) // => true
await libfritter.social.isFriendsWith(archiveA, archiveB) // => true

// posting to the feed
// =

await libfritter.feed.post(archive, {
  text: 'Hello, world!',
})

// posting a reply
await libfritter.feed.post(archive, {
  text: 'Hello, world!',
  threadParent: parent.getRecordURL(), // url of message replying to
  threadRoot: root.getRecordURL() // url of topmost ancestor message
})

// reading the feed
// =

// get post records
await libfritter.feed.listPosts({
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

await libfritter.feed.countPosts(/* same opts for listPosts */)
await libfritter.feed.getPost(url)

// votes
// =

await libfritter.feed.vote(archive, {
  vote: number (-1, 0, or 1),
  subject: string (a url)
})

await libfritter.feed.listVotesFor(subject)

// this returns {up: number, down: number, value: number, upVoters: array of urls, currentUsersVote: number}
async libfritter.feed.countVotesFor(subject)
```

