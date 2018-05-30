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

  AV.User.logInWithMobilePhone(username, password).then(user => {
    console.log(user)
    let sessionToken = user.getSessionToken()
    res.status(200).json(Object.assign({},JSON.parse(JSON.stringify(user)), {sessionToken}))
  }, err => {
    console.log(err.message)
    res.status(401).json(err)
  })
})


module.exports = router