const {toUrl, toArchiveOrigin} = require('./util')

// exported api
// =

class LibFritterSocialAPI {
  constructor (libfritter) {
    this.db = libfritter.db
  }

  getProfile (archive) {
    var archiveUrl = toArchiveOrigin(archive)
    return this.db.profiles.get(archiveUrl + '/profile.json')
  }

  async setProfile (archive, profile) {
    var archiveUrl = toArchiveOrigin(archive)
    await this.db.profiles.upsert(archiveUrl + '/profile.json', profile)
  }

  async setAvatar (archive, imgData, extension) {
    archive = this.db._archives[toArchiveOrigin(archive)]
    if (!archive) throw new Error('Given archive is not indexed by WebDB')
    const filename = `avatar.${extension}`
    await archive.writeFile(filename, imgData, typeof imgData === 'string' ? 'base64' : 'binary')
    return this.db.profiles.upsert(archive.url + '/profile.json', {avatar: filename})
  }

  async follow (archive, target, name) {
    // update the follow record
    var archiveUrl = toArchiveOrigin(archive)
    var targetUrl = toArchiveOrigin(target)
    var changes = await this.db.profiles.where(':origin').equals(archiveUrl).update(record => {
      record.follows = record.follows || []
      if (!record.follows.find(f => f.url === targetUrl)) {
        record.follows.push({url: targetUrl, name})
      }
      return record
    })
    if (changes === 0) {
      throw new Error('Failed to follow: no profile record exists. Run setProfile() before follow().')
    }
  }

  async unfollow (archive, target) {
    // update the follow record
    var archiveUrl = toArchiveOrigin(archive)
    var targetUrl = toArchiveOrigin(target)
    var changes = await this.db.profiles.where(':origin').equals(archiveUrl).update(record => {
      record.follows = record.follows || []
      record.follows = record.follows.filter(f => f.url !== targetUrl)
      return record
    })
    if (changes === 0) {
      throw new Error('Failed to unfollow: no profile record exists. Run setProfile() before unfollow().')
    }
  }

  getFollowersQuery (archive) {
    var archiveUrl = toArchiveOrigin(archive)
    return this.db.profiles.where('followUrls').equals(archiveUrl)
  }

  listFollowers (archive) {
    return this.getFollowersQuery(archive).toArray()
  }

  countFollowers (archive) {
    return this.getFollowersQuery(archive).count()
  }

  async isFollowing (archiveA, archiveB) {
    var archiveAUrl = toArchiveOrigin(archiveA)
    var archiveBUrl = toArchiveOrigin(archiveB)
    var profileA = await this.db.profiles.get(archiveAUrl + '/profile.json')
    return profileA.followUrls.indexOf(archiveBUrl) !== -1
  }

  async listFriends (archive) {
    var followers = await this.listFollowers(archive)
    await Promise.all(followers.map(async follower => {
      follower.isFriend = await this.isFollowing(archive, follower.getRecordOrigin())
    }))
    return followers.filter(f => f.isFriend)
  }

  async countFriends (archive) {
    var friends = await this.listFriends(archive)
    return friends.length
  }

  async isFriendsWith (archiveA, archiveB) {
    var [a, b] = await Promise.all([
      this.isFollowing(archiveA, archiveB),
      this.isFollowing(archiveB, archiveA)
    ])
    return a && b
  }
}

module.exports = LibFritterSocialAPI