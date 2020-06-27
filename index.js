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

class ModularPlatform {}
class ModularUser {}
class ModularPost {}
class ModularMessage {}

/* Module Exports */
module.exports.ModularPlatform = ModularPlatform
module.exports.ModularUser = ModularUser
module.exports.ModularPost = ModularPost
module.exports.ModularMessage = ModularMessage
