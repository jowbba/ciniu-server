var router = require('express').Router()
var AV = require('leanengine')

/**
 *
 user 模块提供注册接口
 *
 @module User 
*/

/**
 * 
 注册用户
 *
 @param {string} username
 @param {string} password
 *  
 */
router.post('/', (req, res, next) => {
  let { username, password } = req.body
  if (!username) return res.status(400).json({ message: 'username error'})
  if (!password) return res.status(400).json({ message: 'password error'})
  
  let role, newUser
  
  var query = new AV.Query(AV.Role)
  query.equalTo('name', 'Common')
  query.find().then(results => {
    // 查询新用户对应角色是否存在
    if (results.length == 1) {
      // 新用户对应角色存在， 创建用户
      role = results[0]
      let user = new AV.User()
      user.setUsername(username)
      user.setPassword(password)
      return user.signUp()
    }else {
      return res.status(403).json( { message: '新用户对应角色尚未创建，请联系管理员'})
    }
  }).then(user => {
    // 创建用户成功， 将新用户添加角色
    newUser = user
    let relation = role.getUsers()
    relation.add(user)
    return role.save()
  }).then( result => {
    // 添加用户角色成功
    let sessionToken = newUser.getSessionToken()
    return res.status(200).json({info: Object.assign({}, newUser, {sessionToken})})
  }).catch(e => {
    return res.status(500).json({ message: e.message})
  })

})

module.exports = router