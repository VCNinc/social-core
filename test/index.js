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
        response.should.equal('NO NO')
        resolve()
      })
    })
  })
})
