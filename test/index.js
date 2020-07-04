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
        platform.useEndpoint('https://example.com')
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
        console.log(response)
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
    newProfile['name'] = "Modulo"
    newProfile['email'] = "modzero@protonmail.com"
    let user = await this.platform.registerUser(newProfile, 'Tr0ub4dour&3')
  })
})
