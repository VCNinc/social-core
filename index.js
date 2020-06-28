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

const { Network, NetworkStatus } = require('@modular/dmnc-core')
// const { ModularSource, ModularVerifier } = require('@modular/smcc-core')
const { ModularConfiguration } = require('@modular/config')
const standard = require('@modular/standard')
const path = require('path')
const level = require('level')

class ModularPlatform {
  constructor (config, options = {}) {
    if (arguments.length !== 1 && arguments.length !== 2) throw new RangeError('ModularPlatform constructor expects one or two arguments')
    if (!(config instanceof ModularConfiguration)) throw new TypeError('Config must be a valid ModularConfiguration object')
    if (typeof options !== 'object') throw new TypeError('Options must be a valid options object')

    this.config = ModularConfiguration.new(config)
    this.dbPath = (options.dbPath === undefined) ? path.join(__dirname, this.config.networkIdentifier, 'db') : options.dbPath
    this.debugLogger = (options.debugLogger === undefined) ? () => {} : options.debugLogger
    this.network = new Network(config, options)
    this.network.platform = this
    this.network.registerHandler('SOCIAL', this.socialHandler)
    this.db = {}
    this.db.users = level(path.join(this.dbPath, 'users'))
    this.db.posts = level(path.join(this.dbPath, 'posts'))
  }

  onReady(callback) {
    this.network.onReady(callback)
  }

  initialize () {
    this.network.initialize()
  }

  useEndpoint (endpoint) {
    this.network.useEndpoint(endpoint)
    this.network.setCoverage('0%1')
  }

  static async standard () {
    const config = await standard.config()
    return new ModularPlatform(config)
  }

  verifiedQuery (id, type, data) {
    return new Promise((resolve, reject) => {
      const requests = [{ layer: 'SOCIAL', type: type, payload: data }]
      const peer = this.network.network.bestNodeCovering(id)
      this.network.peerQuery(peer.endpoint, requests).then((response) => {
        console.log(response)
      }).catch((error) => {
        console.error(error)
      })
    })
  }

  async socialHandler (type, request, network) {
    if (arguments.length !== 3) throw new RangeError('ModularPlatform.socialHandler() expects exactly three arguments')
    if (typeof type !== 'string') throw new TypeError('First argument to ModularPlatform.socialHandler() must be an string')
    if (typeof request !== 'object') throw new TypeError('Second argument to ModularPlatform.socialHandler() must be an object')
    if (!(network instanceof Network)) throw new TypeError('Third argument to ModularPlatform.socialHandler() must be a Network')

    switch (type) {
      case 'AHOY':
        if (network.status === NetworkStatus.READY) return Promise.resolve('AYE AYE')
        else return Promise.reject(new Error('NO NO'))
      case 'POST': return network.postHandler.bind(network.platform)(request.payload)
      default: throw new TypeError('SOCIAL handler cannot serve this request type')
    }
  }

  async postHandler (request) {
    if (arguments.length !== 1) throw new RangeError('ModularPlatform.postHandler() expects exactly one argument')
    if (typeof request !== 'object') throw new TypeError('First argument to ModularPlatform.postHandler() must be an object')
    return this.dbPath
  }
}

class ModularUser {
  constructor (platform) {
    this.platform = platform
  }

  static register (passphrase) {}
  static login (code, passphrase) {}
  static other (code) {}
  updateProfile (fields) {}
  verifySocial (platform, username) {}
  delete () {}
  follow (user) {}
  unfollow (user) {}
  block (user) {}
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

class ModularMessage {
  constructor (sender, recipient) {
    this.sender = sender
    this.recipient = recipient
  }

  setBody (body) {}
  send () {}
}

/* Module Exports */
module.exports.ModularPlatform = ModularPlatform
module.exports.ModularUser = ModularUser
module.exports.ModularPost = ModularPost
module.exports.ModularMessage = ModularMessage
