/**
 * @file Modular Social Information Platform Core (msip-core)
 * @copyright Modular 2020
 * @license MIT
 *
 * @description
 * The Modular Social Information Platform Core (msip-core) package is a core component of Modular.
 * It handles the social networking and communications algorithms that power the Modular information platform.
 *
 * @author Modulo (https://github.com/modulo) <modzero@protonmail.com>
 */

/* global BigInt */
const { Network, NetworkStatus } = require('@modular/dmnc-core')
const { ModularTrustRoot, ModularSource, ModularVerifier } = require('@modular/smcc-core')
const { ModularConfiguration } = require('@modular/config')
const standard = require('@modular/standard')
const level = require('level')

class ModularPlatform {
  constructor (config, options = {}) {
    if (arguments.length !== 1 && arguments.length !== 2) throw new RangeError('ModularPlatform constructor expects one or two arguments')
    if (!(config instanceof ModularConfiguration)) throw new TypeError('Config must be a valid ModularConfiguration object')
    if (typeof options !== 'object') throw new TypeError('Options must be a valid options object')

    this.config = ModularConfiguration.new(config)
    this.network = new Network(config, options)
    this.network.platform = this
    this.debugLogger = this.network.debugLogger
    this.network.registerHandler('SOCIAL', this.socialHandler)
    this.db = {}
    this.db.users = level('users')
    this.db.posts = level('posts')
    this.bigM = BigInt(this.network.network.M)
  }

  onReady (callback) {
    this.network.onReady(callback)
  }

  initialize () {
    this.network.initialize()
  }

  useEndpoint (endpoint) {
    this.network.useEndpoint(endpoint)
  }

  setCoverage (coverage) {
    this.network.setCoverage(coverage)
  }

  static async standard () {
    const config = await standard.config()
    return new ModularPlatform(config)
  }

  propagate (request) {
    if (!Array.isArray(request.reach)) throw new TypeError('Request.reach must be an array')

    const mod = request.mod
    const oldReach = new Set(request.reach)
    const newReach = this.network.network.nodesCovering(mod)
      .map(node => node.endpoint)
      .filter(node => !oldReach.has(node))
    const fullReach = newReach.concat(request.reach)
    request.reach = fullReach

    const promises = []
    newReach.forEach((node) => {
      const promise = this.network.peerQuery(node, [request]) // switch to queued version
      promises.push(promise)
    })

    return Promise.allSettled(promises)
  }

  startPropagation (id, type, payload) {
    const big = BigInt('0x' + Buffer.from(id, 'base64').toString('hex'))
    const mod = big % this.bigM
    return this.propagate({
      layer: 'SOCIAL',
      type: type,
      payload: payload,
      mod: Number(mod),
      reach: [],
      propagate: true
    })
  }

  startSingleton (id, type, payload) {
    return new Promise((resolve, reject) => {
      const big = BigInt('0x' + Buffer.from(id, 'base64').toString('hex'))
      const mod = Number(big % this.bigM)
      const node = this.network.network.bestNodeCovering(mod)
      // switch to queued version
      this.network.peerQuery(node.endpoint, [{
        layer: 'SOCIAL',
        type: type,
        payload: payload,
        mod: mod
      }]).then((result) => {
        resolve(result.results[0].result)
      }).catch((error) => {
        reject(error)
      })
    })
  }

  socialHandler (type, request, network) {
    return new Promise((resolve, reject) => {
      if (arguments.length !== 3) throw new RangeError('ModularPlatform.socialHandler() expects exactly three arguments')
      if (typeof type !== 'string') throw new TypeError('First argument to ModularPlatform.socialHandler() must be an string')
      if (typeof request !== 'object') throw new TypeError('Second argument to ModularPlatform.socialHandler() must be an object')
      if (!(network instanceof Network)) throw new TypeError('Third argument to ModularPlatform.socialHandler() must be a Network')

      if (type !== 'AHOY') {
        if (!Number.isInteger(request.mod)) throw new TypeError('Request.mod must be an integer')
        if (network.coverage.contains(request.mod) !== true) throw new RangeError('Node does not cover this mod. COVERAGE=' + network.coverage.toString())
      }

      function route (type) {
        switch (type) {
          /* Non-propagatory */
          case 'AHOY': return network.platform.ahoyHandler.bind(network.platform)()
          // case 'USER': return network.platform.fetchUser.bind(network.platform)(request)
          case 'POSTS': return network.platform.fetchPosts.bind(network.platform)(request)
          // case 'USERS': return network.platform.userList.bind(network.platform)(request)

          /* Propagatory */
          case 'REGISTER': return network.platform.registerHandler.bind(network.platform)(request)
          case 'POST': return network.platform.postHandler.bind(network.platform)(request)
          case 'FOLLOWS': return network.platform.followsHandler.bind(network.platform)(request)
          default: throw new TypeError('SOCIAL handler cannot serve this request type')
        }
      }

      const allowPropagate = ['REGISTER', 'POST', 'FOLLOWS']

      route(type).then((response) => {
        if (request.propagate === true && allowPropagate.includes(type)) {
          network.platform.propagate(request)
        }
        resolve(response)
      }).catch((error) => {
        reject(error)
      })
    })
  }

  ahoyHandler () {
    return new Promise((resolve, reject) => {
      if (this.network.status === NetworkStatus.READY) resolve('AYE AYE')
      else reject(new Error('NO NO'))
    })
  }

  static validateTimestamp (timestamp) {
    if (!Number.isInteger(timestamp)) throw new TypeError('Timestamp must be an integer')
    if (!(timestamp <= Date.now())) throw new RangeError('Timestamp must be in the past')
    // if (!(timestamp >= (Date.now() - 60000))) throw new RangeError('Timestamp must be recent')
    // todo: move timeout to config
  }

  async followsHandler (request) {
    const payload = request.payload

    if (typeof payload.user !== 'string') throw new TypeError('Incomplete request payload (user).')
    if (!Array.isArray(payload.follows)) throw new TypeError('Incomplete request payload (follows).')
    if (payload.follows.length > 4096) throw new RangeError('Follows list is too large.')
    if (payload.follows.some((i) => i.length > 44)) throw new RangeError('Follows item is too large.')
    if (typeof payload.sig !== 'string') throw new TypeError('Incomplete request payload (signature).')

    ModularPlatform.validateTimestamp(payload.timestamp)

    const big = BigInt('0x' + Buffer.from(payload.user, 'base64').toString('hex'))
    const mod = big % this.bigM

    if (Number(mod) !== request.mod) throw new Error('User id does not match mod')

    const user = await this.loadUser(payload.user)

    user.profile.FOLLOWS = ModularTrustRoot.SHA256(payload.follows.join())
    user.profile.LASTUPDATED = payload.timestamp

    if ((await user.verifier.verifyUserProfileUpdate(payload.sig, payload.timestamp, user.profile)) !== true) { throw new Error('Could not verify profile update.') }

    user.signature = payload.sig
    user.follows = payload.follows

    await user.save()

    return 'Saved follows.'
  }

  async postHandler (request) {
    const payload = request.payload

    if (typeof payload.user !== 'string') throw new TypeError('Incomplete request payload (user).')
    if (typeof payload.body !== 'string') throw new TypeError('Incomplete request payload (body).')
    if (payload.body.length > 1024) throw new RangeError('Post body is too large.')
    // make configurable
    if (typeof payload.prev !== 'string') throw new TypeError('Incomplete request payload (prev).')
    if (typeof payload.sig !== 'string') throw new TypeError('Incomplete request payload (signature).')

    ModularPlatform.validateTimestamp(payload.timestamp)

    const big = BigInt('0x' + Buffer.from(payload.user, 'base64').toString('hex'))
    const mod = big % this.bigM

    if (Number(mod) !== request.mod) throw new Error('User id does not match mod')

    const user = await this.loadUser(payload.user)

    if (user.profile.HEAD !== payload.prev) throw new Error('Head does not match provided; RECENCY=' + user.profile.LASTUPDATED)

    user.profile.HEAD = ModularTrustRoot.blockHash(payload.timestamp + payload.body, user.profile.HEAD)
    user.profile.LASTUPDATED = payload.timestamp

    if ((await user.verifier.verifyUserProfileUpdate(payload.sig, payload.timestamp, user.profile)) !== true) { throw new Error('Could not verify profile update.') }

    user.signature = payload.sig

    user.posts.unshift({
      timestamp: payload.timestamp,
      body: payload.body,
      prev: payload.prev
    })

    await user.save()

    return 'Saved post.'
  }

  loadUser (uid) {
    return new Promise((resolve, reject) => {
      this.db.users.get(uid, (err, value) => {
        if (err) { reject(new Error('User does not exist.')) } else {
          const data = JSON.parse(value)
          const user = new ModularUser(this)
          user.type = 'OTHER'
          user.key = data.key
          user.signature = data.signature
          user.follows = new Set(data.follows)
          ModularVerifier.loadUser(data.key).then((verifier) => {
            user.verifier = verifier
            user.id = user.verifier.id
            const profile = []
            Object.entries(data.profile).forEach(entry => {
              const [key, value] = entry
              profile[key] = value
            })
            user.profile = profile
            this.db.posts.get(uid, (err, value) => {
              if (err) { user.posts = [] } else { user.posts = JSON.parse(value) }
              resolve(user)
            })
          })
        }
      })
    })
  }

  async registerHandler (request) {
    const payload = request.payload

    if (typeof payload.key !== 'string') throw new TypeError('Incomplete request payload (key).')
    if (typeof payload.profileUpdate.user !== 'string') throw new TypeError('Incomplete request payload (user).')
    if (payload.profileUpdate.type !== 'PROFILE') throw new TypeError('Incomplete request payload (type).')
    if (typeof payload.profileUpdate.body !== 'string') throw new TypeError('Incomplete request payload (body).')
    if (typeof payload.profileUpdate.signature !== 'string') throw new TypeError('Incomplete request payload (signature).')
    if (typeof payload.profile !== 'object') throw new TypeError('Incomplete request payload (profile).')

    if ((await ModularUser.exists.bind(this)(payload.profileUpdate.user)) !== false) throw new Error('Already registered.')
    ModularPlatform.validateTimestamp(payload.profileUpdate.timestamp)

    const verifier = await ModularVerifier.loadUser(payload.key)

    if (verifier.id !== payload.profileUpdate.user) throw new Error('UID does not match key.')

    const big = BigInt('0x' + Buffer.from(verifier.id, 'base64').toString('hex'))
    const mod = big % this.bigM

    if (Number(mod) !== request.mod) throw new Error('UID does not match mod.')

    const newProfile = []
    Object.entries(payload.profile).forEach(entry => {
      const [key, value] = entry
      if (key !== 'LASTUPDATED') newProfile[key] = value
    })

    // TODO: limit profile size

    if ((await verifier.verifyUserProfileUpdate(payload.profileUpdate.signature, payload.profileUpdate.timestamp, newProfile)) !== true) { throw new Error('Could not verify profile.') }

    const user = new ModularUser(this)
    user.key = payload.key
    user.id = verifier.id
    user.profile = newProfile
    user.profile.LASTUPDATED = payload.profileUpdate.timestamp
    user.signature = payload.profileUpdate.signature
    user.posts = []
    user.follows = new Set()
    await user.save()

    return 'Saved user.'
  }

  fetchUser (request) {
    const payload = request.payload
    return new Promise((resolve, reject) => {
      if (typeof payload.id !== 'string') throw new TypeError('User id must be a string')

      const big = BigInt('0x' + Buffer.from(payload.id, 'base64').toString('hex'))
      const mod = big % this.bigM

      if (Number(mod) !== request.mod) throw new Error('User id does not match mod')

      this.db.users.get(payload.id, (err, value) => {
        if (err) reject(new Error('User does not exist.'))
        else resolve(JSON.parse(value))
      })
    })
  }

  fetchPosts (request) {
    var max = 256 // make configurable
    if (Number.isInteger(request.max) && request.max > 0 && request.max < max) max = request.max
    const payload = request.payload

    return new Promise((resolve, reject) => {
      if (typeof payload.id !== 'string') throw new TypeError('User id must be a string')

      const big = BigInt('0x' + Buffer.from(payload.id, 'base64').toString('hex'))
      const mod = big % this.bigM

      if (Number(mod) !== request.mod) throw new Error('User id does not match mod')

      this.loadUser(payload.id).then((user) => {
        const posts = user.posts.slice(0, max)
        resolve({
          profile: Object.assign({}, user.profile),
          posts: posts,
          signature: user.signature,
          key: user.key
        })
      }).catch((err) => reject(err))
    })
  }

  userList (request) {
    const max = 100
    // configure maximum
    // bulk downloads may need dedicated async process that bundles data,
    // generates archive, and uploads back to endpoint asynchronously
    return new Promise((resolve, reject) => {
      const users = []
      this.db.users.createReadStream({ limit: max })
        .on('data', (data) => {
          users.push(JSON.parse(data.value))
        })
        .on('error', (err) => {
          reject(err)
        })
        .on('close', () => {
          reject(new Error('Stream error'))
        })
        .on('end', () => {
          resolve(users)
        })
    })
  }

  async registerUser (newProfile, passphrase) {
    const user = new ModularUser(this)
    const packet = await ModularSource.userRegistration(newProfile, passphrase)
    user.id = packet.source.id
    user.type = 'ME'
    user.source = packet.source
    user.key = packet.privateKeyArmored
    user.profile = newProfile
    user.posts = []
    user.follows = new Set()
    this.db.users.put('ME', user.id)
    packet.request.profile = Object.assign({}, newProfile)
    user.signature = packet.request.profileUpdate.signature
    user.save()
    await this.startPropagation(user.id, 'REGISTER', packet.request)
    return user
  }

  async getUserPosts (uid, max = 256) {
    const result = await this.startSingleton(uid, 'POSTS', {
      id: uid,
      max: max
    })

    if (result.status !== 'OK') throw new Error('Could not find user.')

    const response = result.response
    const verifier = await ModularVerifier.loadUser(response.key)
    if (verifier.id !== uid) throw new Error('User ID mismatch')

    const profile = []
    Object.entries(response.profile).forEach(entry => {
      const [key, value] = entry
      profile[key] = value
    })
    if ((await verifier.verifyUserProfileUpdate(response.signature, profile.LASTUPDATED, profile)) !== true) throw new Error('Signature could not be verified.')

    let expected = profile.HEAD
    response.posts.forEach((post) => {
      if (expected === ModularTrustRoot.blockHash(post.timestamp + post.body, post.prev)) {
        post.verified = true
        expected = post.prev
      } else {
        throw new Error('Posts could not be verified')
      }
    })

    return response
  }
}

class ModularUser {
  constructor (platform) {
    this.platform = platform
  }

  static exists (uid) {
    return new Promise((resolve, reject) => {
      this.db.users.get(uid, (err, value) => {
        if (err) resolve(false)
        else resolve(true)
      })
    })
  }

  save () {
    return new Promise((resolve, reject) => {
      // make max post quantity configure
      this.platform.db.posts.put(this.id, JSON.stringify(this.posts.slice(0, 256)), (err) => {
        if (err) reject(err)
        this.platform.db.users.put(this.id, JSON.stringify({
          id: this.id,
          key: this.key,
          profile: Object.assign({}, this.profile),
          signature: this.signature,
          follows: [...this.follows]
        }), (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    })
  }

  async pushFollows () {
    if (this.type !== 'ME') throw new TypeError('Cannot push follows from this account')
    const timestamp = Date.now()
    this.profile.LASTUPDATED = timestamp
    const follows = [...this.follows]
    this.profile.FOLLOWS = ModularTrustRoot.SHA256(follows.join())
    const signature = await this.source.userProfileUpdate(this.profile)
    this.signature = signature.signature
    await this.platform.startPropagation(this.id, 'FOLLOWS', {
      user: this.id,
      timestamp: timestamp,
      follows: follows,
      sig: {
        timestamp: signature.timestamp,
        signature: signature.signature
      }
    })
    await this.save()
    return this.profile.FOLLOWS
  }

  async follow (uid) {
    // make configurable
    if (this.follows.size >= 4096) throw new RangeError('Maximum number of direct follows is 4096.')
    this.follows.add(uid)
    await this.pushFollows()
    return uid
  }

  async unfollow (uid) {
    this.follows.delete(uid)
    await this.pushFollows()
    return uid
  }

  async post (body) {
    if (this.type !== 'ME') throw new TypeError('Cannot post from this account')
    if (typeof body !== 'string') throw new TypeError('Post body must be a string')
    if (body.length > 1024) throw new RangeError('Post size is above maximum allowable') // configurable max length
    const prev = this.profile.HEAD
    const timestamp = Date.now()
    this.profile.HEAD = ModularTrustRoot.blockHash(timestamp + body, prev)
    const signature = await this.source.userProfileUpdate(this.profile, timestamp)
    this.signature = signature.signature
    await this.platform.startPropagation(this.id, 'POST', {
      user: this.id,
      timestamp: timestamp,
      body: body,
      prev: prev,
      sig: signature.signature
    })
    this.posts.unshift({
      timestamp: timestamp,
      body: body,
      prev: prev
    })
    await this.save()
    return this.profile.HEAD
  }

  /** @todo implementation */
  updateProfile (fields) {}

  /** @todo implementation */
  verifySocial (platform, username) {}

  /** @todo implementation */
  delete () {}

  /** @todo implementation */
  block (user) {}

  /** @todo implementation */
  unblock (user) {}

  /** @todo implementation */
  static hidePost (pidToHide) {}
}

// /** @todo implementation */
// class ModularMessage {
//   constructor (sender, recipient) {
//     this.sender = sender
//     this.recipient = recipient
//   }
//
//   setBody (body) { this.body = body }
//   send () {}
// }

/* Module Exports */
module.exports.ModularPlatform = ModularPlatform
module.exports.ModularUser = ModularUser
// module.exports.ModularMessage = ModularMessage
