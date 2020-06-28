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
const { ModularTrustRoot, ModularSource, ModularVerifier } = require('@modular/smcc-core')
const { ModularConfiguration } = require('@modular/config')
const standard = require('@modular/standard')

class ModularPlatform {
  constructor () {}
  static async standard () {}
  user () {}
  async request () {}
  async socialHandler () {}
  async postHandler () {}
}

class ModularUser {
  constructor (ModularPlatform) {}
  static register (passphrase) {}
  static login (code, passphrase) {}
  static other (code) {}
  updateProfile (fields) {}
  verifySocial (platform, username) {}
  delete () {}
  follow (user) {}
  unfollow (user) {}
  block (user) {}
  post () {}
  message (recipient) {}
  static hidePost (pidToHide) {}
}

class ModularPost {
  constructor (author) {}
  setType (type) {}
  setTitle (title) {}
  setLink (link) {}
  setBody (body) {}
  setParent (parent) {}
  addModerator (moderator) {}
  upload () {}
}

class ModularMessage {
  constructor (sender, recipient) {}
  setBody (body) {}
  send () {}
}

/* Module Exports */
module.exports.ModularPlatform = ModularPlatform
module.exports.ModularUser = ModularUser
module.exports.ModularPost = ModularPost
module.exports.ModularMessage = ModularMessage
