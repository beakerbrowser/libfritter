<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [libfritter](#libfritter)
  - [Usage](#usage)
    - [Getting started](#getting-started)
    - [Profiles](#profiles)
    - [Social](#social)
    - [Feed](#feed)
    - [Like / Unlike](#like--unlike)
    - [Notifications](#notifications)
  - [API](#api)
    - [new LibFritter([opts])](#new-libfritteropts)
    - [fritter.db](#fritterdb)
    - [fritter.prepareArchive(archive)](#fritterpreparearchivearchive)
    - [fritter.social.getProfile(archive)](#frittersocialgetprofilearchive)
    - [fritter.social.setProfile(archive, profile)](#frittersocialsetprofilearchive-profile)
    - [fritter.social.setAvatar(archive, imgDataBuffer, extension)](#frittersocialsetavatararchive-imgdatabuffer-extension)
    - [fritter.social.follow(archive, targetUser[, targetUserName])](#frittersocialfollowarchive-targetuser-targetusername)
    - [fritter.social.unfollow(archive, targetUser)](#frittersocialunfollowarchive-targetuser)
    - [fritter.social.listFollowers(archive)](#frittersociallistfollowersarchive)
    - [fritter.social.countFollowers(archive)](#frittersocialcountfollowersarchive)
    - [fritter.social.listFriends(archive)](#frittersociallistfriendsarchive)
    - [fritter.social.countFriends(archive)](#frittersocialcountfriendsarchive)
    - [fritter.social.isFollowing(archiveA, archiveB)](#frittersocialisfollowingarchivea-archiveb)
    - [fritter.social.isFriendsWith(archiveA, archiveB)](#frittersocialisfriendswitharchivea-archiveb)
    - [fritter.feed.post(archive, post)](#fritterfeedpostarchive-post)
    - [fritter.feed.listPosts([opts])](#fritterfeedlistpostsopts)
    - [fritter.feed.countPosts([opts])](#fritterfeedcountpostsopts)
    - [fritter.feed.getThread(url[, opts])](#fritterfeedgetthreadurl-opts)
    - [fritter.feed.vote(archive, data)](#fritterfeedvotearchive-data)
    - [fritter.feed.listVotesFor(subject)](#fritterfeedlistvotesforsubject)
    - [fritter.notifications.listNotifications([opts])](#fritternotificationslistnotificationsopts)
    - [fritter.notifications.countNotifications([opts])](#fritternotificationscountnotificationsopts)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# libfritter

Data definitions and methods for Fritter, a Twitter clone built on top of [Dat](https://github.com/datproject/dat). Uses [WebDB](https://github.com/beakerbrowser/webdb) to read and write records on the Dat network.

See the [Fritter app](https://github.com/beakerbrowser/fritter) to see this library in use.

```js
const LibFritter = require('@beaker/libfritter')
const fritter = new LibFritter()
await fritter.db.open()
await fritter.db.indexArchive('dat://bob.com')
await fritter.social.getProfile('dat://bob.com') // => ...
```

Schemas:

 - [Profile](./schemas/profile.json). The schema for user profiles. A very simple "social media" profile: name, bio, profile pic, and a list of followed users.
 - [Post](./schemas/post.json). The schema for feed posts. Like in Twitter, posts are microblog posts, and can be in reply to other Fritter posts.
 - [Vote](./schemas/vote.json). The schema for votes. In Fritter, only upvotes are used.

## Usage

### Getting started

LibFritter provides a set of methods to be used on top of a [WebDB](https://github.com/beakerbrowser/webdb) instance.

Setup will always include the following steps:

```js
// create the libfritter instance
const fritter = new LibFritter()
// open the webdb
await fritter.db.open()
```

WebDB maintains an index which will determine who shows up in the feed, and whether any read method works for a given archive.
(For instance, you can't call `getProfile()` on an archive that hasn't been indexed.)
You can manage the index's membership using WebDB's methods:

```js
// add a user
await fritter.db.indexArchive('dat://bob.com')
// remove a user
await fritter.db.unindexArchive('dat://bob.com')
```

You can also add individual files to the index, which is helpful when the user navigates to a thread:

```js
// add an individual file
await fritter.db.indexFile('dat://bob.com/posts/1.json')
```

When you create a dat archive for the local user, you'll want to call `prepareArchive()` to setup the folder structure:

```js
var alice = DatArchive.create({title: 'Alice', description: 'My Fritter profile'})
await fritter.prepareArchive(alice)
```

  - [new LibFritter([opts])](#new-libfritteropts)
  - [fritter.db](#fritterdb)
  - [fritter.prepareArchive(archive)](#fritterpreparearchivearchive)

### Profiles

User profiles include a `name`, `bio`, and an avatar image.

```js
await fritter.social.setProfile(alice, {
  name: 'Alice',
  bio: 'A cool hacker'
})

await fritter.social.setAvatar(alice, 'iVBORw...rkJggg==', 'png')

await fritter.social.getProfile(alice) /* => {
  name: 'Alice',
  bio: 'A cool hacker',
  avatar: '/avatar.png'
} */
```

  - [fritter.social.getProfile(archive)](#frittersocialgetprofilearchive)
  - [fritter.social.setProfile(archive, profile)](#frittersocialsetprofilearchive-profile)
  - [fritter.social.setAvatar(archive, imgDataBuffer, extension)](#frittersocialsetavatararchive-imgdatabuffer-extension)

### Social

Every user maintains a public list of other users they follow.
You can modify and examine the social graph using these methods.

```js
await fritter.social.follow(alice, bob)
await fritter.social.follow(alice, 'dat://bob.com') // (urls work too)
await fritter.social.listFollowers(bob) // => [{name: 'Alice', bio: 'A cool hacker', ...}]
```

  - [fritter.social.follow(archive, targetUser[, targetUserName])](#frittersocialfollowarchive-targetuser-targetusername)
  - [fritter.social.unfollow(archive, targetUser)](#frittersocialunfollowarchive-targetuser)
  - [fritter.social.listFollowers(archive)](#frittersociallistfollowersarchive)
  - [fritter.social.countFollowers(archive)](#frittersocialcountfollowersarchive)
  - [fritter.social.listFriends(archive)](#frittersociallistfriendsarchive)
  - [fritter.social.countFriends(archive)](#frittersocialcountfriendsarchive)
  - [fritter.social.isFollowing(archiveA, archiveB)](#frittersocialisfollowingarchivea-archiveb)
  - [fritter.social.isFriendsWith(archiveA, archiveB)](#frittersocialisfriendswitharchivea-archiveb)

### Feed

The feed contains simple text-based posts.

```js
// posting a new thread
await fritter.feed.post(alice, {
  text: 'Hello, world!',
})

// posting a reply
await fritter.feed.post(alice, {
  text: 'Hello, world!',
  threadParent: parent.getRecordURL(), // url of message replying to
  threadRoot: root.getRecordURL() // url of topmost ancestor message
})
```

The list method will show any indexed posts.

```js
await fritter.feed.listPosts({
  fetchAuthor: true,
  countVotes: true,
  reverse: true,
  rootPostsOnly: true,
  countReplies: true
})
```

You can view the posts of an individual user by adding the `author` filter, and also narrow down the feed to only include the followed users using the `authors` filter.

  - [fritter.feed.post(archive, post)](#fritterfeedpostarchive-post)
  - [fritter.feed.listPosts([opts])](#fritterfeedlistpostsopts)
  - [fritter.feed.countPosts([opts])](#fritterfeedcountpostsopts)
  - [fritter.feed.getThread(url[, opts])](#fritterfeedgetthreadurl-opts)

### Like / Unlike

Users can like posts using the votes.

```js
await fritter.feed.vote(alice, {vote: 1, subject: 'dat://bob.com/posts/1.json'})
await fritter.feed.listVotesFor('dat://bob.com/posts/1.json') /* => {
  up: 1,
  down: 0,
  value: 1,
  upVoters: ['dat://alice.com']
}
```

  - [fritter.feed.vote(archive, data)](#fritterfeedvotearchive-data)
  - [fritter.feed.listVotesFor(subject)](#fritterfeedlistvotesforsubject)

### Notifications

You can view recent notifications (likes and replies on your posts) using the notifications api.

```js
await fritter.notifications.listNotifications() /* => [
  { type: 'reply',
    url: 'dat://alice.com/posts/0jc7w07be.json',
    createdAt: 1515517526289 },
  { type: 'vote',
    vote: 1,
    subject: 'dat://alice.com/posts/0jc7w079o.json',
    origin: 'dat://bob.com',
    createdAt: 1515517526308 }
]*/
```

 - [fritter.notifications.listNotifications(opts)](#fritternotificationslistnotificationsopts)

## API

### new LibFritter([opts])

```js
const fritter = new LibFritter()
```

 - `opts` Object.
   - `mainIndex` String. The name (in the browser) or path (in node) of the main indexes. Defaults to `'fritter'`.
   - `DatArchive` Constructor. The class constructor for dat archive instances. If in node, you should specify [node-dat-archive](https://npm.im/node-dat-archive).

Create a new `LibFritter` instance.
The `mainIndex` will control where the indexes are stored.
You can specify different names to run multiple LibFritter instances at once.

### fritter.db

The [WebDB](https://github.com/beakerbrowser/webdb) instance.

### fritter.prepareArchive(archive)

```js
await fritter.prepareArchive(alice)
```

 - `archive` DatArchive. The archive to prepare for use in fritter.

Create needed folders for writing to an archive.
This should be called on any archive that represents the local user.

### fritter.social.getProfile(archive)

```js
await fritter.social.getProfile(alice) // => {name: 'Alice', bio: 'A cool hacker', avatar: '/avatar.png'}
```

 - `archive` DatArchive or String. The archive to read.

Get the profile data of the given archive.

### fritter.social.setProfile(archive, profile)

```js
await fritter.social.setProfile(alice, {name: 'Alice', bio: 'A cool hacker'})
```

 - `archive` DatArchive or String. The archive to modify.
 - `profile` Object.
   - `name` String.
   - `bio` String.

Set the profile data of the given archive.

### fritter.social.setAvatar(archive, imgDataBuffer, extension)

```js
await fritter.social.setAvatar(alice, myPngData, 'png')
```

 - `archive` DatArchive or String. The archive to modify.
 - `imgDataBuffer` String, ArrayBuffer, or Buffer. The image data to store. If a string, must be base64-encoded.
 - `extensions` String. The file-extension of the avatar.

Set the avatar image of the given archive.

### fritter.social.follow(archive, targetUser[, targetUserName])

```js
await fritter.social.follow(alice, bob, 'Bob')
```

 - `archive` DatArchive or String. The archive to modify.
 - `targetUser` DatArchive or String. The archive to follow.
 - `targetUserName` String. The name of the archive being followed.

Add to the follow-list of the given archive.

### fritter.social.unfollow(archive, targetUser)

```js
await fritter.social.unfollow(alice, bob)
```

 - `archive` DatArchive or String. The archive to modify.
 - `targetUser` DatArchive or String. The archive to unfollow.

Remove from the follow-list of the given archive.

### fritter.social.listFollowers(archive)

```js
await fritter.social.listFollowers(alice)
```

 - `archive` DatArchive or String. The archive to find followers of.

List users in db that follow the given archive.

### fritter.social.countFollowers(archive)

```js
await fritter.social.countFollowers(alice)
```

 - `archive` DatArchive or String. The archive to find followers of.

Count users in db that follow the given archive.

### fritter.social.listFriends(archive)

```js
await fritter.social.listFriends(alice)
```

 - `archive` DatArchive or String. The archive to find friends of.

List users in db that mutually follow the given archive.

### fritter.social.countFriends(archive)

```js
await fritter.social.countFriends(alice)
```

 - `archive` DatArchive or String. The archive to find friends of.

Count users in db that mutually follow the given archive.


### fritter.social.isFollowing(archiveA, archiveB)

```js
await fritter.social.isFollowing(alice, bob) // => true
```

 - `archiveA` DatArchive or String. The archive to test.
 - `archiveB` DatArchive or String. The follow target.

Test if `archiveA` is following `archiveB`.

### fritter.social.isFriendsWith(archiveA, archiveB)

```js
await fritter.social.isFriendsWith(alice, bob) // => true
```
 - `archiveA` DatArchive or String.
 - `archiveB` DatArchive or String.

Test if `archiveA` and `archiveB` are mutually following each other.

### fritter.feed.post(archive, post)

```js
// posting a new thread
await fritter.feed.post(alice, {
  text: 'Hello, world!',
})

// posting a reply
await fritter.feed.post(alice, {
  text: 'Hello, world!',
  threadParent: parent.getRecordURL(), // url of message replying to
  threadRoot: root.getRecordURL() // url of topmost ancestor message
})
```

 - `archive` DatArchive or String. The archive to modify.
 - `post` Object.
   - `text` String. The content of the post.
   - `threadParent` String. The URL of the parent post in the thread. Only needed in a reply; must also include `threadRoot`.
   - `threadRoot` String. The URL of the root post in the thread. Only needed in a reply; must also include `threadParent`.

Post a new message to the feed.

### fritter.feed.listPosts([opts])

```js
await fritter.feed.listPosts({limit: 30})
```

 - `opts` Object.
   - `author` String | DatArchive. Single-author filter.
   - `authors` Array<String>. Multi-author filter.
   - `rootPostsOnly` Boolean. Remove posts in the feed that are replies
   - `after` Number. Filter out posts created before the given timestamp.
   - `before` Number. Filter out posts created after the given timestamp.
   - `limit` Number. Add a limit to the number of results given.
   - `offset` Number. Add an offset to the results given. Useful in pagination.
   - `reverse` Boolean. Reverse the order of the output.
   - `fetchAuthor` Boolean. Populate the `.author` attribute of the result objects with the author's profile record.
   - `countReplies` Boolean. Populate the `.replies` attribute of the result objects with number of replies to the post.
   - `countVotes` Boolean. Populate the `.votes` attribute of the result objects with the results of `countVotesFor`.

Fetch a list of posts in the feed index.

### fritter.feed.countPosts([opts])

```js
await fritter.feed.countPosts({author: alice})
```

 - `opts` Object.
   - `author` String | DatArchive. Single-author filter.
   - `authors` Array<String>. Multi-author filter.
   - `rootPostsOnly` Boolean. Remove posts in the feed that are replies
   - `after` Number. Filter out posts created before the given timestamp.
   - `before` Number. Filter out posts created after the given timestamp.
   - `limit` Number. Add a limit to the number of results given.
   - `offset` Number. Add an offset to the results given. Useful in pagination.

Count posts in the feed index.

### fritter.feed.getThread(url[, opts])

```js
await fritter.feed.getThread('dat://alice.com/posts/1.json')
```

 - `url` String. The URL of the thread.
 - `opts` Object.
   - `authors` Array<String>. Filter the posts in the thread down to those published by the given list of archive urls.

Fetch a discussion thread, including all replies.

### fritter.feed.vote(archive, data)

```js
await fritter.feed.vote(alice, {
  vote: 1,
  subject: 'dat://bob.com/posts/1.json'
})
```

 - `archive` DatArchive or String. The archive to modify.
 - `data` Object.
   - `vote` Number. The vote value. Must be -1 (dislike), 0 (no opinion), or 1 (like).
   - `subject` String. The url of the item being voted on.

Publish a vote on the given subject.

### fritter.feed.listVotesFor(subject)

```js
await fritter.feed.listVotesFor('dat://bob.com/posts/1.json')
```

  - `subject` String. The url of the item.

Returns a vote tabulation of the given subject.

### fritter.notifications.listNotifications([opts])

```js
await fritter.notifications.listNotifications({limit: 30})
```

 - `opts` Object.
   - `after` Number. Filter out notifications created before the given timestamp.
   - `before` Number. Filter out notifications created after the given timestamp.
   - `limit` Number. Add a limit to the number of results given.
   - `offset` Number. Add an offset to the results given. Useful in pagination.
   - `reverse` Boolean. Reverse the order of the output.
   - `fetchAuthor` Boolean. Populate the `.author` attribute of the result objects with the author's profile record.
   - `fetchPost` Boolean. Populate the `.post` attribute of the result objects with the post that's the subject of the notification.

Fetch a list of events in the notifications index.

### fritter.notifications.countNotifications([opts])

```js
await fritter.notifications.countNotifications()
```

 - `opts` Object.
   - `after` Number. Filter out notifications created before the given timestamp.
   - `before` Number. Filter out notifications created after the given timestamp.
   - `limit` Number. Add a limit to the number of results given.
   - `offset` Number. Add an offset to the results given. Useful in pagination.

Fetch a count of events in the notifications index.