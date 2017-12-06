const test = require('ava')
const DatArchive = require('node-dat-archive')
const tempy = require('tempy')
const LibFritter = require('../')
const fs = require('fs')

var libfritter

var alice
var bob
var carla

test.before('archive creation', async t => {
  // create the archives
  ;[alice, bob, carla] = await Promise.all([
    DatArchive.create({title: 'Alice', localPath: tempy.directory()}),
    DatArchive.create({title: 'Bob', localPath: tempy.directory()}),
    DatArchive.create({title: 'Carla', localPath: tempy.directory()})
  ])

  // setup libfritter
  libfritter = new LibFritter(tempy.directory(), {DatArchive})
  await libfritter.open()
  await libfritter.prepareArchive(alice)
  await libfritter.prepareArchive(bob)
  await libfritter.prepareArchive(carla)
  await libfritter.addSource([alice, bob, carla])
})

test.after('close db', async t => {
  await libfritter.db.close()
})

test('profile data', async t => {
  // write profiles
  await libfritter.social.setProfile(alice, {
    name: 'Alice',
    bio: 'A cool hacker girl',
    avatar: 'alice.png',
    follows: [{name: 'Bob', url: bob.url}, {name: 'Carla', url: carla.url}]
  })
  await libfritter.social.setProfile(bob, {
    name: 'Bob',
    avatar: 'bob.png',
    bio: 'A cool hacker guy'
  })
  const avatarBuffer = fs.readFileSync('avatar.jpg').buffer
  await libfritter.social.setAvatar(bob, avatarBuffer, 'jpg')
  await libfritter.social.follow(bob, alice, 'Alice')
  await libfritter.social.setProfile(carla, {
    name: 'Carla'
  })
  await libfritter.social.follow(carla, alice)

  // verify data
  t.truthy(await bob.stat('/avatar.jpg'))
  t.deepEqual(profileSubset(await libfritter.social.getProfile(alice)), {
    name: 'Alice',
    bio: 'A cool hacker girl',
    avatar: 'alice.png',
    followUrls: [bob.url, carla.url],
    follows: [{name: 'Bob', url: bob.url}, {name: 'Carla', url: carla.url}]
  })
  t.deepEqual(profileSubset(await libfritter.social.getProfile(bob)), {
    name: 'Bob',
    bio: 'A cool hacker guy',
    avatar: 'avatar.jpg',
    followUrls: [alice.url],
    follows: [{name: 'Alice', url: alice.url}]
  })
  t.deepEqual(profileSubset(await libfritter.social.getProfile(carla)), {
    name: 'Carla',
    bio: undefined,
    avatar: undefined,
    followUrls: [alice.url],
    follows: [{url: alice.url}]
  })
})

test('votes', async t => {
  // vote
  await libfritter.feed.vote(alice, {subject: 'https://beakerbrowser.com', vote: 1})
  await libfritter.feed.vote(bob, {subject: 'https://beakerbrowser.com', vote: 1})
  await libfritter.feed.vote(carla, {subject: 'https://beakerbrowser.com', vote: 1})
  await libfritter.feed.vote(alice, {subject: 'dat://beakerbrowser.com', vote: 1})
  await libfritter.feed.vote(bob, {subject: 'dat://beakerbrowser.com', vote: 0})
  await libfritter.feed.vote(carla, {subject: 'dat://beakerbrowser.com', vote: -1})
  await libfritter.feed.vote(alice, {subject: 'dat://bob.com/posts/1.json', vote: -1})
  await libfritter.feed.vote(bob, {subject: 'dat://bob.com/posts/1.json', vote: -1})
  await libfritter.feed.vote(carla, {subject: 'dat://bob.com/posts/1.json', vote: -1})

  // listVotesFor

  // simple usage
  t.deepEqual(voteSubsets(await libfritter.feed.listVotesFor('https://beakerbrowser.com')), [
    { subject: 'https://beakerbrowser.com',
      vote: 1,
      author: false },
    { subject: 'https://beakerbrowser.com',
      vote: 1,
      author: false },
    { subject: 'https://beakerbrowser.com',
      vote: 1,
      author: false }
  ])
  // url is normalized
  t.deepEqual(voteSubsets(await libfritter.feed.listVotesFor('https://beakerbrowser.com/')), [
    { subject: 'https://beakerbrowser.com',
      vote: 1,
      author: false },
    { subject: 'https://beakerbrowser.com',
      vote: 1,
      author: false },
    { subject: 'https://beakerbrowser.com',
      vote: 1,
      author: false }
  ])
  // simple usage
  t.deepEqual(voteSubsets(await libfritter.feed.listVotesFor('dat://beakerbrowser.com')), [
    { subject: 'dat://beakerbrowser.com',
      vote: 1,
      author: false },
    { subject: 'dat://beakerbrowser.com',
      vote: 0,
      author: false },
    { subject: 'dat://beakerbrowser.com',
      vote: -1,
      author: false }
  ])
  // simple usage
  t.deepEqual(voteSubsets(await libfritter.feed.listVotesFor('dat://bob.com/posts/1.json')), [
    { subject: 'dat://bob.com/posts/1.json',
      vote: -1,
      author: false },
    { subject: 'dat://bob.com/posts/1.json',
      vote: -1,
      author: false },
    { subject: 'dat://bob.com/posts/1.json',
      vote: -1,
      author: false }
  ])

  // countVotesFor

  // simple usage
  t.deepEqual(await libfritter.feed.countVotesFor('https://beakerbrowser.com'), {
    up: 3,
    down: 0,
    value: 3,
    upVoters: [alice.url, bob.url, carla.url]
  })
  // url is normalized
  t.deepEqual(await libfritter.feed.countVotesFor('https://beakerbrowser.com/'), {
    up: 3,
    down: 0,
    value: 3,
    upVoters: [alice.url, bob.url, carla.url]
  })
  // simple usage
  t.deepEqual(await libfritter.feed.countVotesFor('dat://beakerbrowser.com'), {
    up: 1,
    down: 1,
    value: 0,
    upVoters: [alice.url]
  })
  // simple usage
  t.deepEqual(await libfritter.feed.countVotesFor('dat://bob.com/posts/1.json'), {
    up: 0,
    down: 3,
    value: -3,
    upVoters: []
  })
})

test('posts', async t => {
  // make some posts
  var post1Url = await libfritter.feed.post(alice, {text: 'First'})
  await libfritter.feed.post(bob, {text: 'Second'})
  await libfritter.feed.post(carla, {text: 'Third'})
  var reply1Url = await libfritter.feed.post(bob, {
    text: 'First reply',
    threadParent: post1Url,
    threadRoot: post1Url
  })
  await libfritter.feed.post(carla, {
    text: 'Second reply',
    threadParent: reply1Url,
    threadRoot: post1Url
  })
  await libfritter.feed.post(alice, {text: 'Fourth'})

  // add some votes
  await libfritter.feed.vote(bob, {vote: 1, subject: post1Url, subjectType: 'post'})
  await libfritter.feed.vote(carla, {vote: 1, subject: post1Url, subjectType: 'post'})

  // get a post
  t.deepEqual(postSubset(await libfritter.feed.getPost(post1Url)), {
    author: true,
    text: 'First',
    threadParent: undefined,
    threadRoot: undefined,
    votes: {up: 2, down: 0, value: 2, upVoters: [bob.url, carla.url]},
    replies: [
      {
        author: true,
        text: 'First reply',
        threadParent: post1Url,
        threadRoot: post1Url,
        votes: {up: 0, down: 0, value: 0, upVoters: []},
        replies: undefined
      },
      {
        author: true,
        text: 'Second reply',
        threadParent: reply1Url,
        threadRoot: post1Url,
        votes: {up: 0, down: 0, value: 0, upVoters: []},
        replies: undefined
      }
    ]
  })

  // list posts
  t.deepEqual(postSubsets(await libfritter.feed.listPosts()), [
    { author: false,
      text: 'First',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'Second',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'Third',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'First reply',
      threadParent: post1Url,
      threadRoot: post1Url,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'Second reply',
      threadParent: reply1Url,
      threadRoot: post1Url,
      votes: undefined,
      replies: undefined },
    { author: false,
      text: 'Fourth',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined }
  ])

  // list posts (no replies)
  t.deepEqual(postSubsets(await libfritter.feed.listPosts({rootPostsOnly: true})), [
    {
      author: false,
      text: 'First',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined
    },
    {
      author: false,
      text: 'Second',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined
    },
    {
      author: false,
      text: 'Third',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined
    },
    {
      author: false,
      text: 'Fourth',
      threadParent: undefined,
      threadRoot: undefined,
      votes: undefined,
      replies: undefined
    }
  ])

  // list posts (authors, votes, and replies)
  t.deepEqual(postSubsets(await libfritter.feed.listPosts({fetchAuthor: true, rootPostsOnly: true, countVotes: true, fetchReplies: true})), [
    {
      author: true,
      text: 'First',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 2, down: 0, value: 2, upVoters: [bob.url, carla.url]},
      replies: [
        {
          author: true,
          text: 'First reply',
          threadParent: post1Url,
          threadRoot: post1Url,
          votes: {up: 0, down: 0, value: 0, upVoters: []},
          replies: undefined
        },
        {
          author: true,
          text: 'Second reply',
          threadParent: reply1Url,
          threadRoot: post1Url,
          votes: {up: 0, down: 0, value: 0, upVoters: []},
          replies: undefined
        }
      ]
    },
    {
      author: true,
      text: 'Second',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: []
    },
    {
      author: true,
      text: 'Third',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: []
    },
    {
      author: true,
      text: 'Fourth',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: []
    }
  ])

  // list posts (limit, offset, reverse)
  t.deepEqual(postSubsets(await libfritter.feed.listPosts({rootPostsOnly: true, limit: 1, offset: 1, fetchAuthor: true, countVotes: true, fetchReplies: true})), [
    {
      author: true,
      text: 'Second',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: []
    }
  ])
  t.deepEqual(postSubsets(await libfritter.feed.listPosts({rootPostsOnly: true, reverse: true, limit: 1, offset: 1, fetchAuthor: true, countVotes: true, fetchReplies: true})), [
    {
      author: true,
      text: 'Third',
      threadParent: undefined,
      threadRoot: undefined,
      votes: {up: 0, down: 0, value: 0, upVoters: []},
      replies: []
    }
  ])
})

function profileSubset (p) {
  return {
    name: p.name,
    bio: p.bio,
    avatar: p.avatar,
    followUrls: p.followUrls,
    follows: p.follows
  }
}

function voteSubsets (vs) {
  vs = vs.map(voteSubset)
  vs.sort((a, b) => b.vote - a.vote)
  return vs
}

function voteSubset (v) {
  return {
    subject: v.subject,
    vote: v.vote,
    author: !!v.author
  }
}

function postSubsets (ps) {
  ps = ps.map(postSubset)
  return ps
}

function postSubset (p) {
  return {
    author: !!p.author,
    text: p.text,
    threadParent: p.threadParent,
    threadRoot: p.threadRoot,
    votes: p.votes,
    replies: p.replies ? postSubsets(p.replies) : undefined
  }
}
