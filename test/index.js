var {ModularPlatform, ModularUser, ModularSocial} = require('../index.js');
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
    await user.post('Hello, world!')
    await user.post('Another post!')
    await user.post('A final post!')
    let posts = (await this.platform.getUserProfile(user.id)).posts
    posts[0].body.should.equal('A final post!')
    posts[1].body.should.equal('Another post!')
    posts[2].body.should.equal('Hello, world!')
  })

  test('initialization', async () => {
    const u1 = []
    u1['name'] = 'U1'
    let user1 = await this.platform.registerUser(u1, 'Tr0ub4dour&3')

    let profile = (await this.platform.getUserProfile(user1.id)).profile
    profile.name.should.equal('U1')
  })

  test('full follow flow', async () => {
    const u1 = []
    u1['name'] = 'U1'
    let user1 = await this.platform.registerUser(u1, 'Tr0ub4dour&3')

    const u2 = []
    u2['name'] = 'U2'
    let user2 = await this.platform.registerUser(u2, 'Tr0ub4dour&3')

    const u3 = []
    u3['name'] = 'U3'
    let user3 = await this.platform.registerUser(u3, 'Tr0ub4dour&3')

    const u4 = []
    u4['name'] = 'U4'
    let user4 = await this.platform.registerUser(u4, 'Tr0ub4dour&3')

    await user4.follow(user1.id)
    await user4.follow(user2.id)
    await user4.follow(user3.id)

    let follows = (await this.platform.getUserProfile(user4.id)).follows
    follows.should.be.an('array').with.lengthOf(3)
    follows[0].should.equal(user1.id)
    follows[1].should.equal(user2.id)
    follows[2].should.equal(user3.id)

    await user4.unfollow(user2.id)

    follows = (await this.platform.getUserProfile(user4.id)).follows
    follows.should.be.an('array').with.lengthOf(2)
    follows[0].should.equal(user1.id)
    follows[1].should.equal(user3.id)

    return
  }).timeout(20000)

  test('full flow', async () => {
    const newProfile = []
    newProfile['name'] = "Test 2"
    newProfile['email'] = "test2@example.com"
    newProfile['etc'] = '12345'
    let user = await this.platform.registerUser(newProfile, 'Tr0ub4dour&3')
    await user.post('Hello, world!')
    await user.post('Another post!')
    await user.post('A final post!')
    let posts = (await this.platform.getUserProfile(user.id)).posts
    posts[0].body.should.equal('A final post!')
    posts[1].body.should.equal('Another post!')
    posts[2].body.should.equal('Hello, world!')

    const u1 = []
    u1['name'] = 'U1'
    let user1 = await this.platform.registerUser(u1, 'Tr0ub4dour&3')
    await user1.post('post 1')
    await user1.post('post 2')

    const u2 = []
    u2['name'] = 'U2'
    let user2 = await this.platform.registerUser(u2, 'Tr0ub4dour&3')
    await user2.post('post 3')
    await user2.post('post 4')

    const u3 = []
    u3['name'] = 'U3'
    let user3 = await this.platform.registerUser(u3, 'Tr0ub4dour&3')
    await user3.post('post 5')
    await user3.post('post 6')

    await user.follow(user1.id)
    await user.follow(user2.id)
    await user.follow(user3.id)

    let follows = (await this.platform.getUserProfile(user.id)).follows
    follows.should.be.an('array').with.lengthOf(3)
    follows[0].should.equal(user1.id)
    follows[1].should.equal(user2.id)
    follows[2].should.equal(user3.id)

    await user.unfollow(user2.id)

    follows = (await this.platform.getUserProfile(user.id)).follows
    follows.should.be.an('array').with.lengthOf(2)
    follows[0].should.equal(user1.id)
    follows[1].should.equal(user3.id)

    let timeline = await user.getTimeline()
    let ranked = await ModularSocial.rankChronological(timeline)

    ranked[0].body.should.equal('post 6')
    ranked[1].body.should.equal('post 5')
    ranked[2].body.should.equal('post 2')
    ranked[3].body.should.equal('post 1')

    return
  }).timeout(20000)
})
