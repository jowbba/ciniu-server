var router = require('express').Router()
var AV = require('leanengine')
var E = require('./error')


/**
 * 
  用户登录
 *
 @param {string} username
 @param {string} password
 */

router.post('/', async (req, res) => {
  try {
    let { username, password } = req.body
    if (!username) return res.status(400).json({ message: 'username error'})
    if (!password) return res.status(400).json({ message: 'password error'})

    let user = await AV.User.logIn(username, password)
    let sessionToken = user.getSessionToken()

    res.status(200).json(Object.assign({},JSON.parse(JSON.stringify(user)), {sessionToken}))  
  } catch (e) {
    console.error(e.message, 'in get token')
    res.error(e)
  }
})


module.exports = router