var router = require('express').Router()
var AV = require('leanengine')
var { getUserWithRoot, getVipRoles, getRoles } = require('./lib')

/**
 @module User 
*/
const token = req => {
  return { sessionToken: req.headers['x-lc-session'] }
}

// 查询所有用户， 管理员可用
router.get('/', (req, res) => {
  let count, { limit, skip } = req.query
  let userQuery = new AV.Query('_User')
  let countQuery = new AV.Query('_User')
  if (limit) userQuery.limit(limit)
  if (skip) userQuery.skip(skip)
  // 查询数量
  countQuery.count(token(req)).then(result => {
    count = result
    return userQuery.find(token(req))
    // 查询数据
  }, err =>  res.status(err.code).json({ message: err.rawMessage })).then(result => {
    res.status(200).json({count, data: result})
  }, err => res.status(err.code).json({ message: err.rawMessage }))
})

// 注册验证码
router.post('/code', (req, res) => {
  let { username } = req.body
  if (!username) return res.status(400).json({ message: 'username is required'})
  AV.Cloud.requestSmsCode(username).then(success => {
    res.status(200).json({ message: 'ok'})
  }, err => {
    res.status(400).json({ message: err.message })
  })
})

// 注册用户
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
    
  }, err => {
    console.log(err)
    res.status(500).json({ message: err.message})
  })
  .then(result => {
    let sessionToken = newUser.getSessionToken()
    res.status(200).json(Object.assign({}, JSON.parse(JSON.stringify(newUser)), {sessionToken}))
  }, err => res.status(500).json({ message: err.message}))
})

// 修改密码验证码
router.post('/pwdcode', (req, res) => {
  let { username } = req.body
  if (!username) return res.status(400).json({ message: 'username is required'})
  AV.User.requestPasswordResetBySmsCode(username).then(success => {
    res.status(200).json({ message: 'ok'})
  }, err => {
    res.status(400).json({ message: err.message })
  })
})

// 修改密码
router.post('/password', (req, res) => {
  let { password, code } = req.body
  // if (!username) return res.status(400).json({ message: 'username error'})
  if (!password) return res.status(400).json({ message: 'password error'})
  if (!code) return res.status(400).json({ message: 'code is required'})

  AV.User.resetPasswordBySmsCode(code, password).then(success => {
    res.status(200).json(success)
  }, err => res.status(400).json({ message: err.message}))
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
  typeQuery.find(token(req)).then(result => {
    if (result.length !== 1) return res.status(400).json({ message: 'typeCode is invalid'})
    typeId = result[0].id
    return userQuery.find(token(req))
  }, err => res.status(400).json({ message: 'check code error'})).then(result => {
    if (result.length !== 1) return res.status(400).json({ message: 'userId is invalid'})
    let user = AV.Object.createWithoutData('_User', userId)
    let wordsDBType = AV.Object.createWithoutData('WordsDBTypeInfo', typeId)

    let Relation = AV.Object.extend('UserAndWordsRelationInfo')
    let relation = new Relation()

    return relation.save({ user, wordsDBType}, token(req))
  }).then(result => {
    res.status(200).json(result)
  }, err => res.status(500).json({ message: err.rawMessage }))
})

// 查询用户角色
router.get('/role', async (req, res) => {
  try {
    let user = await AV.User.become(req.headers['x-lc-session'])
    let roles = await user.getRoles()
    res.status(200).json(roles)
  } catch (e) {
    res.status(e.code? e.code: 500).json({ message: e.message })
  }
})


// 给用户添加角色
router.post('/role', async (req, res) => {
  try {
    let { username, types, time, vip } = req.body
    // 检验参数
    if (!username) return res.status(400).json({ message: 'username is required'})
    if (!vip && (!types || !Array.isArray(types) || types.length == 0)) 
      return res.status(400).json({ message: 'type is required'})
    if (!time || (typeof time) !== 'number') 
      return res.status(400).json({ message: 'time is required'})

    // 检查用户用户
    let user = await getUserWithRoot(username)
    if (!user.length) return res.status(404).json({ message: 'user is not exist'})

    // 检查types, 获取roles
    let roles
    if (vip) roles = await getVipRoles(req)
    else roles = await getRoles(types, req)
    if (roles.length == 0 ) return res.status(403).json({message: 'can not fond role'})

    // 为用户赋予角色
    for(let i = 0; i < roles.length; i++) {

      // 创建角色记录
      let { oldRoleRecord, newRoleRecord } = await createRoleRecord(req,
        user[0].attributes.username, roles[i].attributes.name, 
        roles[i].attributes.typeName, time, '由管理员创建')

      // 查询用户是否已拥有角色
      let roleQuery = new AV.Query(AV.Role)
      roleQuery.equalTo('name', roles[i].attributes.name)
      roleQuery.equalTo('users', user[0])
      let roleResult = await roleQuery.find(token(req))

      if (roleResult.length > 0) {
        // 用户具备当前角色
        console.log('用户具备当前角色')
      } else {
        // 用户不具备当前角色
        console.log('用户不具备当前角色')
        let relation = roles[i].getUsers()
        relation.add(user[0])
        await roles[i].save({}, token(req))
      }

      if (oldRoleRecord) {
        oldRoleRecord.set('active', false)
        await oldRoleRecord.save(null,token(req))
      }

      newRoleRecord.set('active', true)
      await newRoleRecord.save(null,token(req))
    }


    res.status(200).json({})
  } catch (e) {
    res.status(e.code? e.code: 500).json({ message: e.message })
  }
})

// 给用户添加点数
router.post('/point', async (req, res) => {
  try {
    let { username, point } = req.body
    // 检查操作者
    let operationUser = await AV.User.become(req.headers['x-lc-session'])
    let operationUserRoles = J(await operationUser.getRoles())
    let isManager = operationUserRoles.find(item => item.name == 'Manager')
    if (!isManager) throw new Error("user don't have access to api")

    // 检查point
    if (typeof point !== 'number' || point <= 0) throw new Error('point should be number and grater than 0')
    let user = await getUserWithRoot(username)
    // 检查user
    if (!user.length) return res.status(404).json({ message: 'user is not exist'})

    user[0].increment('point', point)
    let result = await user[0].save({}, {useMasterKey: true})
    
    res.status(200).json(result)
  } catch (e) {
    res.status(e.code? e.code: 500).json({ message: e.message })
  }
})



// 创建角色记录
const createRoleRecord = async (req, username, roleName, typeName, time, mark) => {
  let nowDateTime = (new Date()).getTime()
  // 查询之前记录
  let oldRecorQuery = new AV.Query('RoleRecord')
  oldRecorQuery.equalTo('username', username)
  oldRecorQuery.equalTo('roleName', roleName)
  oldRecorQuery.descending('expiryTime')
  let oldRecordResult = await oldRecorQuery.find(token(req))
  if (oldRecordResult[0]) {
    console.log('用户拥有相同角色记录')
    let oldTime = oldRecordResult[0].attributes.expiryTime.getTime()
    if (oldTime > nowDateTime) {
      console.log('用户记录依然有效，从上个时间点延期')
      nowDateTime = oldTime
    } else console.log('用户记录已过期，从现在开始计时')
  }

  let RoleRecord = AV.Object.extend('RoleRecord')
  let roleRecord = new RoleRecord()
  
  let msec = time * 24 * 60 * 60 * 1000 + nowDateTime
  let expiryTime = new Date(msec)
  let active = false

  let newRoleRecord = await roleRecord.save({
    username, roleName, typeName, expiryTime, mark, active}, token(req))
  
    return {
      oldRoleRecord: oldRecordResult[0]? oldRecordResult[0]: null,
      newRoleRecord
    }
}

const J = obj => JSON.parse(JSON.stringify(obj))

module.exports = router