var {ModularPlatform, ModularUser, ModularPost, ModularMessage} = require('../index.js');
var should = require('chai').should();

suite('index', () => {
  suiteSetup(() => {
    return new Promise((resolve, reject) => {
      ModularPlatform.standard().then((platform) => {
        this.platform = platform
        platform.onReady(() => {
          resolve()
        })
        platform.setCoverage('0%1')
        platform.initialize()
      })
    })
  })

  test('network', () => {
    return new Promise((resolve, reject) => {
      this.platform.network.handleQuery({
          "network": "modular",
          "requests": [
              {"layer": "NET", "type": "PING"},
              {"layer": "SOCIAL", "type": "AHOY", "mod": 0}
          ]
      }).then((response) => {
        response.should.deep.equal({
          network: 'modular',
          version: 1,
          results: [
            { status: 'OK', response: 'PONG' },
            { status: 'OK', response: 'AYE AYE' }
          ]
        })
        resolve()
      })
    })
  })

  test('register', async () => {
    const newProfile = []
    newProfile['name'] = "Test"
    newProfile['email'] = "testuser@example.com"
    let user = await this.platform.registerUser(newProfile, 'Tr0ub4dour&3')
  })

  test('full post flow', async () => {
    const newProfile = []
    newProfile['name'] = "Test 2"
    newProfile['email'] = "test2@example.com"
    newProfile['etc'] = '12345'
    let user = await this.platform.registerUser(newProfile, 'Tr0ub4dour&3')
    let pid = await user.post('Hello, world!')
    const big = BigInt('0x' + Buffer.from(user.id, 'base64').toString('hex'))
    const mod = big % this.platform.bigM
    this.platform.network.handleQuery({
        "network": "modular",
        "requests": [
            {"layer": "SOCIAL", "type": "POSTS", "payload": {
              "id": user.id
            }, "mod": Number(mod)},
        ]
    })
  })
})
