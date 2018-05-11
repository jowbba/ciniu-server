var router = require('express').Router()
var AV = require('leanengine')


/**
 *
 user 模块提供登录接口
 *
 @module User 
*/



/**
 * 
  用户登录
 *
 @param {string} username
 @param {string} password
 */

router.post('/', (req, res) => {
  let { username, password } = req.body
  if (!username) return res.status(400).json({ message: 'username error'})
  if (!password) return res.status(400).json({ message: 'password error'})

  AV.User.logIn(username, password).then(user => {
    res.status(200).json({sessionToken: user.getSessionToken()})
  }, err => {
    console.log(err.message)
    res.status(401).json(err)
  })
})


module.exports = router