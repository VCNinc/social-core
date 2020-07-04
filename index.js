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
const { ModularSource, ModularVerifier } = require('@modular/smcc-core')
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
      const promise = this.network.peerQuery(node, [request])
      promises.push(promise)
    })

    return Promise.allSettled(promises)
  }

  startPropagation (id, type, payload) {
    const big = BigInt('0x' + id)
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

  socialHandler (type, request, network) {
    return new Promise((resolve, reject) => {
      if (arguments.length !== 3) throw new RangeError('ModularPlatform.socialHandler() expects exactly three arguments')
      if (typeof type !== 'string') throw new TypeError('First argument to ModularPlatform.socialHandler() must be an string')
      if (typeof request !== 'object') throw new TypeError('Second argument to ModularPlatform.socialHandler() must be an object')
      if (!(network instanceof Network)) throw new TypeError('Third argument to ModularPlatform.socialHandler() must be a Network')

      if (!Number.isInteger(request.mod)) throw new TypeError('Request.mod must be an integer')
      if (network.coverage.contains(request.mod) !== true) throw new RangeError('Node does not cover this mod. COVERAGE=' + network.coverage.toString())

      function route (type) {
        switch (type) {
          /* Non-propagatory */
          case 'AHOY': return network.platform.ahoyHandler.bind(network.platform)()
          case 'USER': return network.platform.fetchUser.bind(network.platform)(request)

          /* Propagatory */
          case 'REGISTER': return network.platform.registerHandler.bind(network.platform)(request)
          default: throw new TypeError('SOCIAL handler cannot serve this request type')
        }
      }

      const allowPropagate = ['REGISTER']

      route(type).then((response) => {
        if (request.propagate === true && allowPropagate.includes(type)) {
          this.propagate(request)
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
    if (!(timestamp >= (Date.now() - 60000))) throw new RangeError('Timestamp must be recent')
    // todo: move timeout to config
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

    const big = BigInt('0x' + verifier.id)
    const mod = big % this.bigM

    if (mod !== request.mod) throw new Error('UID does not match mod.')

    const newProfile = []
    Object.entries(payload.profile).forEach(entry => {
      const [key, value] = entry
      newProfile[key] = value
    })

    if (!(await verifier.verifyUserProfileUpdate(payload.profileUpdate.signature, payload.profileUpdate.timestamp, newProfile))) { throw new Error('Could not verify profile.') }

    const user = new ModularUser(this)
    user.key = payload.key
    user.id = verifier.id
    user.profile = Object.assign({}, newProfile)
    await user.save()

    return 'Saved user.'
  }

  fetchUser (request) {
    const payload = request.payload
    return new Promise((resolve, reject) => {
      if (typeof payload.id !== 'string') throw new TypeError('User id must be a string')

      const big = BigInt('0x' + payload.id)
      const mod = big % this.bigM

      if (Number(mod) !== request.mod) throw new Error('User id does not match mod')

      this.db.users.get(payload.id, (err, value) => {
        if (err) reject(new Error('User does not exist.'))
        resolve(JSON.parse(value))
      })
    })
  }

  async registerUser (newProfile, passphrase) {
    const user = new ModularUser(this)
    const packet = await ModularSource.userRegistration(newProfile, passphrase)
    user.type = 'ME'
    user.source = packet.source
    user.id = packet.source.id
    user.key = packet.privateKeyArmored
    user.profile = newProfile
    user.save()
    this.db.users.put('ME', user.id)
    packet.request.profile = Object.assign({}, newProfile)
    console.log(JSON.stringify(packet.request))
    // await this.startPropagation(user.id, 'REGISTER', packet.request)
    return user
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

  toString () {
    return JSON.stringify({
      id: this.id,
      key: this.key,
      profile: this.profile
    })
  }

  save () {
    return new Promise((resolve, reject) => {
      this.platform.db.users.put(this.id, this.toString(), (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  static login (uid, passphrase) {}
  static other (uid) {}

  follow (user) {}

  /** @todo implementation */
  updateProfile (fields) {}

  /** @todo implementation */
  verifySocial (platform, username) {}

  /** @todo implementation */
  unfollow (user) {}

  /** @todo implementation */
  delete () {}

  /** @todo implementation */
  block (user) {}

  /** @todo implementation */
  unblock (user) {}

  /** @todo implementation */
  static hidePost (pidToHide) {}
}

class ModularPost {
  constructor (author) {
    this.author = author
  }

  setType (type) {}
  setTitle (title) {}
  setLink (link) {}
  setBody (body) {}
  setParent (parent) {}
  addModerator (moderator) {}
  upload () {}
}

/** @todo implementation */
class ModularMessage {
  constructor (sender, recipient) {
    this.sender = sender
    this.recipient = recipient
  }

  setBody (body) { this.body = body }
  send () {}
}

/* Module Exports */
module.exports.ModularPlatform = ModularPlatform
module.exports.ModularUser = ModularUser
module.exports.ModularPost = ModularPost
module.exports.ModularMessage = ModularMessage
