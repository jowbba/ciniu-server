var router = require('express').Router()
var AV = require('leanengine')
var { rootVer } = require('./middleware')
var { getUserWithRoot, getVipRoles, getRoles } = require('./lib')
var { createErr, setPoints, setRoles, token } = require('./lib')

/**
 @module User
*/

// 查询所有用户， 管理员可用
router.get('/all', async (req, res) => {
  try {
    let { limit, skip } = req.query
    let userQuery = new AV.Query('_User')
    let countQuery = new AV.Query('_User')
    if (limit) userQuery.limit(limit)
    if (skip) userQuery.skip(skip)
    // 查询数量
    let count = await countQuery.count(token(req))
    // 查询数据
    let data = await userQuery.find(token(req))
    console.log(data)
    res.status(200).json({count, data})
  } catch (e) {
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
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
router.post('/points', async (req, res) => {
  try {
    let { username, points } = req.body
    // 检查操作者
    let operationUser = await AV.User.become(req.headers['x-lc-session'])
    let operationUserRoles = J(await operationUser.getRoles())
    let isManager = operationUserRoles.find(item => item.name == 'Manager')
    if (!isManager) throw new Error("user don't have access to api")

    // 检查point
    if (typeof points !== 'number' || points <= 0) throw new Error('points should be number and grater than 0')
    let user = await getUserWithRoot(username)
    // 检查user
    if (!user.length) return res.status(404).json({ message: 'user is not exist'})

    user[0].increment('points', points)
    let result = await user[0].save({}, {useMasterKey: true})
    
    res.status(200).json(result)
  } catch (e) {
    res.status(e.code? e.code: 500).json({ message: e.message })
  }
})
// -------------------------------以上为管理员操作-------------------------------
// 注册验证码
router.post('/code', async (req, res) => {
  try {
    let { username } = req.body
    if (!username) return res.status(400).json({ message: 'username is required'})
    let existUser = await getUserWithRoot(username)
    if (existUser.length > 0) throw createErr('用户已存在', 401)
    AV.Cloud.requestSmsCode(username).then(success => {
      res.status(200).json({ message: 'ok'})
    }, err => {
      res.status(400).json({ message: err.message })
    })
  } catch (e) {
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
})

// 注册用户
router.post('/', async (req, res) => {
  try {
    let { username, password, code, sale } = req.body
    if (!username) throw createErr('用户名不能为空', 400)
    if (!password) throw createErr('密码不能为空', 400)
    if (!code) throw createErr('验证码不能为空', 400)

    let existUser = await getUserWithRoot(username)
    if (existUser.length > 0) throw createErr('用户已存在', 401)

    let newUser = await AV.User.signUpOrlogInWithMobilePhone(username, code, { password, points: 0, sale: sale?sale:'-1' })
    let sessionToken = newUser.getSessionToken()

    // await setRoles([newUser], ['Vip'], 180, '新用户赠送60天会员')
    await setPoints([newUser], 200)

    let recordQuery = new AV.Query('RoleRecord')
    recordQuery.equalTo('username', username)
    recordQuery.equalTo('active', true)
    let roles = await recordQuery.find({useMasterKey: true})

    res.status(200).json(Object.assign({}, JSON.parse(JSON.stringify(newUser)), {sessionToken, roles}))
  } catch (e) {
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
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

// 查询用户角色
router.get('/', async (req, res) => {
  try {
    let user = await AV.User.become(req.headers['x-lc-session'])
    let { points, username } = user.attributes
    let count = Math.floor(points / 8)
    // let countWord = Math.floor(points / 3) * 500
    let countWord = 9999999
    let recordQuery = new AV.Query('RoleRecord')
    recordQuery.equalTo('username', username)
    recordQuery.equalTo('active', true)
    let roles = await recordQuery.find({useMasterKey: true})
    let vip = roles.length > 0?true: false
    res.status(200).json({points, roles, count, countWord })
    
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