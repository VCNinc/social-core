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

  // test('network', () => {
  //   return new Promise((resolve, reject) => {
  //     this.platform.network.handleQuery({
  //         "network": "modular",
  //         "requests": [
  //             {"layer": "NET", "type": "PING"},
  //             {"layer": "SOCIAL", "type": "AHOY", "mod": 0}
  //         ]
  //     }).then((response) => {
  //       response.should.deep.equal({
  //         network: 'modular',
  //         version: 1,
  //         results: [
  //           { status: 'OK', response: 'PONG' },
  //           { status: 'OK', response: 'AYE AYE' }
  //         ]
  //       })
  //       resolve()
  //     })
  //   })
  // })
  //
  // test('register', async () => {
  //   const newProfile = []
  //   newProfile['name'] = "Test"
  //   newProfile['email'] = "testuser@example.com"
  //   let user = await this.platform.registerUser(newProfile, 'Tr0ub4dour&3')
  // })
  //
  // test('full post flow', async () => {
  //   const newProfile = []
  //   newProfile['name'] = "Test 2"
  //   newProfile['email'] = "test2@example.com"
  //   newProfile['etc'] = '12345'
  //   let user = await this.platform.registerUser(newProfile, 'Tr0ub4dour&3')
  //   await user.post('Hello, world!')
  //   await user.post('Another post!')
  //   await user.post('A final post!')
  //   let posts = (await this.platform.getUserPosts(user.id)).posts
  //   posts[0].body.should.equal('A final post!')
  //   posts[1].body.should.equal('Another post!')
  //   posts[2].body.should.equal('Hello, world!')
  // })
  //
  // test('initialization', async () => {
  //   const u1 = []
  //   u1['name'] = 'U1'
  //   let user1 = await this.platform.registerUser(u1, 'Tr0ub4dour&3')
  //
  //   let posts = (await this.platform.getUserPosts(user1.id))
  //   console.log(posts)
  // })
  //
  // test('full follow flow', async () => {
  //   const u1 = []
  //   u1['name'] = 'U1'
  //   let user1 = await this.platform.registerUser(u1, 'Tr0ub4dour&3')
  //
  //   const u2 = []
  //   u2['name'] = 'U2'
  //   let user2 = await this.platform.registerUser(u2, 'Tr0ub4dour&3')
  //
  //   const u3 = []
  //   u3['name'] = 'U3'
  //   let user3 = await this.platform.registerUser(u3, 'Tr0ub4dour&3')
  //
  //   const u4 = []
  //   u4['name'] = 'U4'
  //   let user4 = await this.platform.registerUser(u4, 'Tr0ub4dour&3')
  //
  //   // await user4.follow(user1.id)
  //
  //   let posts = (await this.platform.getUserPosts(user4.id))
  //   console.log(posts)
  //
  // }).timeout(20000)
})
