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
const token = req => req.headers['x-lc-session']

router.get('/', (req, res) => {
  let count, { limit, skip } = req.query
  let userQuery = new AV.Query('_User')
  if (limit) userQuery.limit(limit)
  if (skip) userQuery.skip(skip)
  // 查询数量
  userQuery.count({sessionToken: token(req)}).then(count => {
    count = count
    return userQuery.find({sessionToken: token(req)})
    // 查询数据
  }, err =>  res.status(err.code).json({ message: err.rawMessage })).then(result => {
    console.log(result.length)
    res.status(200).json({count, data: result})
  }, err => res.status(err.code).json({ message: err.rawMessage }))
})

// 创建用户
router.post('/', (req, res, next) => {
  let { username, password, code } = req.body
  if (!username) return res.status(400).json({ message: 'username error'})
  if (!password) return res.status(400).json({ message: 'password error'})
  if (!code) return res.status(400).json({ message: 'code is required'})

  // 查询分类
  let typeQuery = new AV.Query('WordsDBTypeInfo')
  let typeArr, newUser
  typeQuery.find().then(types => {
    typeArr = types.map( item => item.id)
    // 注册用户
    return AV.User.signUpOrlogInWithMobilePhone(username, code, { password })
  }, err => res.status(400).json({ message: 'find type error' }) )
  .then(result => {
    newUser = result
    // 创建用户与词库关联关系
    let promiseArr = []
    typeArr.forEach(item => {
      let Relation = AV.Object.extend('UserAndWordsRelationInfo')
      let relation = new Relation()
      let user = AV.Object.createWithoutData('_User', result.id)
      let type = AV.Object.createWithoutData('WordsDBTypeInfo', item)
      promiseArr.push(relation.save({user, type}))
    })
    return Promise.all(promiseArr)
    
  }, err => res.status(500).json({ message: err.message}))
  .then(result => {
    let sessionToken = newUser.getSessionToken()
    res.status(200).json(Object.assign({}, JSON.parse(JSON.stringify(newUser)), {sessionToken}))
  }, err => res.status(500).json({ message: err.message}))
})

router.post('/code', (req, res) => {
  let { username } = req.body
  if (!username) return res.status(400).json({ message: 'username is required'})
  AV.Cloud.requestSmsCode(username).then(success => {
    res.status(200).json({ message: 'ok'})
  }, err => {
    res.status(400).json({ message: err.message })
  })
})

router.post('/relation', (req, res) => {
  let { typeCode, userId } = req.body

  if (!typeCode || !userId) return res.status(400).json({ message: 'params error'})
  if (typeof typeCode !== 'number') return res.status(400).json({ message: 'typeCode should be number'})
  if (typeof userId !== 'string') return res.status(400).json({ message: 'userId should be string'})

  let typeQuery = new AV.Query('WordsDBTypeInfo')
  typeQuery.equalTo('code', typeCode)

  let userQuery = new AV.Query('_User')
  userQuery.equalTo('objectId', userId)
  let typeId
  
  // 根据code 查询
  typeQuery.find({ sessionToken: token(req)}).then(result => {
    if (result.length !== 1) return res.status(400).json({ message: 'typeCode is invalid'})
    typeId = result[0].id
    return userQuery.find({ sessionToken: token(req) })
  }, err => res.status(400).json({ message: 'check code error'})).then(result => {
    if (result.length !== 1) return res.status(400).json({ message: 'userId is invalid'})
    let user = AV.Object.createWithoutData('_User', userId)
    let wordsDBType = AV.Object.createWithoutData('WordsDBTypeInfo', typeId)

    let Relation = AV.Object.extend('UserAndWordsRelationInfo')
    let relation = new Relation()

    return relation.save({ user, wordsDBType}, { sessionToken: token(req)})
  }).then(result => {
    res.status(200).json(result)
  }, err => res.status(500).json({ message: err.rawMessage }))
})

module.exports = router