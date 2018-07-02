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

router.post('/', async (req, res) => {
  try {
    let { username, password } = req.body
    if (!username) return res.status(400).json({ message: 'username error'})
    if (!password) return res.status(400).json({ message: 'password error'})
    let user = await AV.User.logIn(username, password)
    
    let { points } = user.attributes
    let count = Math.floor(points / 4)
    let recordQuery = new AV.Query('RoleRecord')
    recordQuery.equalTo('username', user.attributes.username)
    recordQuery.equalTo('active', true)
    let roles = await recordQuery.find({useMasterKey: true})


    let sessionToken = user.getSessionToken()
    res.status(200).json(Object.assign({},JSON.parse(JSON.stringify(user)), {sessionToken, points, roles, count}))  
  } catch (e) {
    if (e.code == 210) e.message = '用户名或密码错误'
    res.status(e.code && e.code > 300? e.code: 500).json({ message: e.message })
  }

  
  
})


module.exports = router