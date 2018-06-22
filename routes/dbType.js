var router = require('express').Router()
var AV = require('leanengine')

const token = req => {
  return { sessionToken: req.headers['x-lc-session'] }
}

// 查询相同name || code 的记录
const getSameName = (name, req) => {
  let nameQuery = new AV.Query('WordsDBTypeInfo')
  nameQuery.equalTo('name', name)
  return nameQuery.find(token(req))
}

const getSameCode = (code, req) => {
  let codeQuery = new AV.Query('WordsDBTypeInfo')
  codeQuery.equalTo('code', code)
  return codeQuery.find(token(req))
}

// 查询角色是否存在
const queryRoleOfType = (code, req) => {
  let roleQuery = new AV.Query(AV.Role)
  roleQuery.equalTo('name', code)
  return roleQuery.find(token(req))
}

// 创建词库对应角色
const createRoleOfType = (name, req) => {
  let newRole = new AV.Role(name, createAcl())
  return newRole.save({}, token(req))
}

// 获取公开ACL
const createAcl = () => {
  let acl = new AV.ACL()
  acl.setPublicReadAccess(true)
  acl.setPublicWriteAccess(false)
  acl.setRoleWriteAccess('Manager', true)

  return acl
}

// 查询所有type
router.get('/', (req, res) => {
  let query = new AV.Query('WordsDBTypeInfo')
  query.find(token(req)).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage })
  )
})

// 创建type
router.post('/', async (req, res) => {
  try {
    let role, newName
    let { name, version, code, publishtime } = req.body
    // 检查参数
    if (!name || typeof name !== 'string') return res.status(400).json({ message: 'name error' })
    if (!version || typeof version !== 'number') return res.status(400).json({ message: 'version error' })
    if (!code || typeof code !== 'number') return res.status(400).json({ message: 'code error' })
    if (publishtime && typeof publishtime !== 'string') return res.status(400).json({ message: 'publishtime should be string' })
    newName = (new Buffer(name)).toString('hex')
    // 检查name，code 是否重复
    let sameResult = await Promise.all([getSameName(name, req), getSameCode(code, req)])
    if (sameResult.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name or code' })
    // 检查角色是否存在
    let roleResult = await queryRoleOfType(newName, req)
    
    // 角色不存在则创建
    if (roleResult[0]) role = roleResult[0]
    else role = await createRoleOfType(newName, req)
    
    // 创建分类 
    // todo 为分类添加ACL控制
    let Type = AV.Object.extend('WordsDBTypeInfo')
    let type = new Type()
    let options = { name, version, code, publishtime, role }
    let newType = await type.save(options, token(req))
    res.status(200).json(newType)

  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// 修复角色缺失
router.patch('/', async (req, res) => {
  try {
    // 筛选缺失role字段的type object
    let typeQuery = new AV.Query('WordsDBTypeInfo')
    let typeResult = await typeQuery.find(token(req))
    typeResult = JSON.parse(JSON.stringify(typeResult))
    let needToFixArr = typeResult.filter(type => !type.role)
    let newTypeArr = []
    // 为缺失的object 创建角色
    for (let i = 0; i < needToFixArr.length; i++) {
      let role
      let name = needToFixArr[i].name
      let newName = (new Buffer(name)).toString('hex')
      let roleResult = await queryRoleOfType(newName, req)
      let type = AV.Object.createWithoutData('WordsDBTypeInfo', needToFixArr[i].objectId)
      // 获取角色
      if (roleResult.length == 0) role = await createRoleOfType(newName, req) 
      else role = roleResult[0]
      // 更新
      type.set('role', role)
      newTypeArr.push(await type.save({}, token(req)))
    }

    // console.log(newTypeArr)
    res.status(200).json(newTypeArr)
  } catch (e) {
    res.status(500).json({ message: e.message })
  } 
})

router.patch('/:id', (req, res) => {
  let { name, version } = req.body
  if (!name && !version) return res.status(400).json({ message: 'params error' })
  if (name && typeof name !== 'string') return res.status(400).json({ message: 'name error' })
  if (version && typeof version !== 'number') return res.status(400).json({ message: 'version error' })

  let type = AV.Object.createWithoutData('WordsDBTypeInfo', req.params.id)

  if (name) type.set('name', name)
  if (version) type.set('version', version)

  let promiseArr = []
  if (name) promiseArr.push(getSameName(name, req))

  Promise.all(promiseArr).then(result => {
    if (result.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name' })

    type.save({}, token(req)).then(result => {
      res.status(200).json(result)
    }, error => {
      console.log('error', error, error.rawMessage)
      res.status(400).json({ message: error.rawMessage })
    })

  }).catch(e => res.status(400).json({ message: 'check params error' }))

})

router.delete('/:id', (req, res) => {
  let type = AV.Object.createWithoutData('WordsDBTypeInfo', req.params.id)
  type.destroy(token(req)).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage })
  )
})

module.exports = router