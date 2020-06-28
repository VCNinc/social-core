var {ModularPlatform, ModularUser, ModularPost, ModularMessage} = require('../index.js');
var should = require('chai').should();

suite('index', () => {
  suiteSetup(() => {
    return new Promise((resolve, reject) => {
      ModularPlatform.standard().then((platform) => {
        this.platform = platform;
        resolve()
        platform.onReady(() => {
          console.log('ready')
        })
      })
    })
  })

  test('network', () => {
    return new Promise((resolve, reject) => {
      this.platform.network.handleRequest({layer: 'SOCIAL', type: 'AHOY'}).then((response) => {
        response.message.should.equal('NO NO')
        resolve()
      })
    })
  })

  test('working', () => {
    return new Promise((resolve, reject) => {
      this.platform.network.handleQuery({
          "network": "modular",
          "requests": [
              {"layer": "NET", "type": "PING"},
              {"layer": "SOCIAL", "type": "AHOY"},
              {"layer": "SOCIAL", "type": "POST"}
          ]
      }).then((response) => {
        resolve()
      })
    })
  })
})
