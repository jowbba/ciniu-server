var router = require('express').Router()
var AV = require('leanengine')
var { getAllRelations, getSettingByUser, createError, createResult } = require('./lib')
var { rootVer, basicVer } = require('./middleware')

/**
 *
 word 模块提供词查询功能
 *
 @module Word
*/

const token = req => {
  return { sessionToken: req.headers['x-lc-session'] }
}

// 创建词
router.post('/', (req, res) => {
  try {
    let { name, marks, code } = req.body
    if (!name || typeof name !== 'string') return res.status(400).json({ message: 'name error' })
    if (!code || typeof code !== 'number') return res.status(400).json({ message: 'code error' })

    let Word = AV.Object.extend('ContrabandWordsInfo')
    let word = new Word()

    Promise.all([getSameName(name, req), getSameCode(code, req)]).then(result => {
      if (result.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name or code' })
      word.save({ name, marks, code }, token(req)).then(result => {
        res.status(200).json(result)
      }, error => res.status(500).json({ message: err.rawMessage }))
    }).catch(e => res.status(400).json({ message: 'check params error'}))

  } catch (e) {
    console.log(e)
    res.status(500).json(e)
  }
})

// 更新词
router.patch('/:id', (req, res) => {
  let { name, marks } = req.body

  if (name && typeof name !== 'string') return res.status(400).json({ message: 'name error' })
  if (marks && typeof marks !== 'string') return res.status(400).json({ message: 'marks error' })

  let word = AV.Object.createWithoutData('ContrabandWordsInfo', req.params.id)

  if (name) word.set('name', name)
  if (marks) word.set('marks', marks)

  let promiseArr = []
  if (name) promiseArr.push(getSameName(name, req))

  Promise.all(promiseArr).then(result => {
    if (result.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name' })

    word.save({}, token(req)).then(result => {
      res.status(200).json(result)
    }, error => {
      console.log('error', error, error.rawMessage)
      res.status(400).json({ message: error.rawMessage })
    })

  }).catch(e => res.status(400).json({ message: 'check params error'}))

})

// 删除词
router.delete('/:id', (req, res) => {
  let type = AV.Object.createWithoutData('ContrabandWordsInfo', req.params.id)
  type.destroy(token(req)).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage }))
})

// 创建词关系
router.post('/relation', async (req, res) => {
  try {
    let c = token(req)
    let { typeCode, wordCode, categoryCode } = req.body
    // 检查请求参数
    if (!typeCode || !wordCode || !categoryCode) return res.status(400).json({ message: 'params error'})
    if (typeof typeCode !== 'number') return res.status(400).json({ message: 'typeCode should be number'})
    if (typeof wordCode !== 'number') return res.status(400).json({ message: 'wordCode should be number'})
    if (typeof categoryCode !== 'number') return res.status(400).json({ message: 'categoryCode should be number'})
    
    // 检查是否存在code对应对象
    let typeQuery = new AV.Query('WordsDBTypeInfo')
    typeQuery.include('role')
    typeQuery.equalTo('code', typeCode)

    let wordQuery = new AV.Query('ContrabandWordsInfo')
    wordQuery.equalTo('code', wordCode)

    let categoryQuery = new AV.Query('WordsCategoryInfo')
    categoryQuery.equalTo('code', categoryCode)

    let promiseArr = [typeQuery.find(c), wordQuery.find(c), categoryQuery.find(c)]
    let promiseResult = await Promise.all(promiseArr)
    if (promiseResult.find(item => item.length !== 1)) return res.status(400).json({ message: 'check params error'})

    // 创建code 对应对象
    let wordsDBType = AV.Object.createWithoutData('WordsDBTypeInfo', promiseResult[0][0].id)
    let contrabandWords = AV.Object.createWithoutData('ContrabandWordsInfo', promiseResult[1][0].id)
    let wordsCategory = AV.Object.createWithoutData('WordsCategoryInfo', promiseResult[2][0].id)
    
    // 查询是否存在相同关系
    let sameRelationQuery  = new AV.Query('WordsRelationInfo')
    sameRelationQuery.equalTo('wordsDBType', wordsDBType)
    sameRelationQuery.equalTo('contrabandWords', contrabandWords)
    sameRelationQuery.equalTo('wordsCategory', wordsCategory)

    let sameRaw = await sameRelationQuery.find(c)
    if (sameRaw.length > 0) return res.status(400).json({ message: 'exist same raw'})

    // type 对应角色查询
    // let type = JSON.parse(JSON.stringify(promiseResult[0][0]))
    // if (!type.role.name) res.status(400).json({message: 'type role has not been created'})
    // let typeRoleName = type.role.name
    // let roleQuery = new AV.Query(AV.Role)
    // roleQuery.equalTo('name', typeRoleName)
    // let roleQueryResult = await roleQuery.first(c)
    // if (!roleQueryResult) res.status(403).json({ message: '关系中type类目对应的角色还没创建，数据库存在错误，请修复'})

    // acl
    let acl = new AV.ACL()
    // acl.setRoleReadAccess(typeRoleName, true)
    // acl.setRoleReadAccess('Manager', true)
    // acl.setRoleWriteAccess('Manager', true)
    // acl.setRoleReadAccess('Vip', true)
    // acl.setRoleWriteAccess('Vip', true)
    acl.setPublicReadAccess(true)
    acl.setPublicWriteAccess(false)
    acl.setRoleWriteAccess('Manager', true)
    
    // 创建关系对象
    let Relation = AV.Object.extend('WordsRelationInfo')
    let relation = new Relation()
    relation.setACL(acl)

    let options = { wordsDBType, contrabandWords, wordsCategory }
    let newRelation = await relation.save(options, c)

    res.status(200).json(newRelation)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// 修复词关系ACL缺失
router.patch('/', async (req, res) => {
  try {
    // 查询所有词关系
    let relations = await getAllRelations(req, res)
    let successCount = 0
    let failedCount = 0

    for(let i = 0; i < relations.length; i++ ) {
      let relation = relations[i]
      let obj = AV.Object.createWithoutData('WordsRelationInfo', relation.objectId)
      let roleToObject = relation.wordsDBType.role
      if (!roleToObject) {
        failedCount++
        continue;
      }
      let acl = new AV.ACL()
      // acl.setRoleReadAccess(roleToObject.name, true)
      // acl.setRoleReadAccess('Manager', true)
      // acl.setRoleWriteAccess('Manager', true)
      // acl.setRoleReadAccess('Vip', true)
      // acl.setRoleWriteAccess('Vip', true)
      acl.setPublicReadAccess(true)
      acl.setPublicWriteAccess(false)
      acl.setRoleWriteAccess('Manager', true)
      

      obj.setACL(acl)
      try {
        await obj.save({}, token(req))
      } catch (e) {
        failedCount++
        continue
      }

      successCount++
      console.log('after adjust', successCount, failedCount)
    }

    res.status(200).json({ successCount, failedCount })

    // res.status(200).json({})
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
  
})

// 查询词
router.get('/', basicVer, async (req, res) => {
  try {
    // 查询用户角色
    let { user } = req
    let roles = await user.getRoles({useMasterKey: true})
    // if (roles.length == 0) return res.status(403).json({ message: 'word is not available'})

    // 查询词关系
    let relations = await getAllRelations(req, res)

    let { notSelectedType, notSelectedCategory } = (await getSettingByUser(user)).attributes
    
    
    let m = new Map()
    relations.forEach((relation, index) => {
      let { contrabandWords, wordsDBType, wordsCategory } = relation
      //去除用户不勾选的词库
      let typeIndex = notSelectedType.findIndex(item => item == wordsDBType.code)
      let categoryIndex = notSelectedCategory.findIndex(item => item == wordsCategory.code)
      if (typeIndex !== -1 || categoryIndex !== -1) return

      // 整合所有词
      let { name, code } = contrabandWords
      let obj = m.get(code)
      let typeObj = getTypeObj(wordsDBType)
      let categoryObj = getCategoryObj(wordsCategory)
      if (obj) {
        let o = Object.assign({}, obj)
        let sameType = o.type.find(item => item.code == wordsDBType.code)
        let sameCategory = o.category.find(item => item.code == wordsCategory.code)
        
        if (!sameType) o.type.push(typeObj)
        if (!sameCategory) o.category.push(categoryObj)
        
        m.set(contrabandWords.code, o)
      } else {
        m.set(code, { name, code, type: [ typeObj ], category: [ categoryObj ] })
      }
    })

    res.status(200).json({ data: [...m.values()]})

  } catch (e) {
    console.log(e, 'in get word relation')
    res.status(500).json({ message: e.message })
  }
  
})

// 查询相同name || code 的记录
const getSameName = (name, req) => {
  let nameQuery = new AV.Query('ContrabandWordsInfo')
  nameQuery.equalTo('name', name)
  return nameQuery.find(token(req))
}

const getSameCode = (code, req) => {
  let codeQuery = new AV.Query('ContrabandWordsInfo')
  codeQuery.equalTo('code', code)
  return codeQuery.find(token(req))
}

const split = (count, perSize) => {
  let arr = []
  let position = 0
  while(position < count) {
    arr.push({limit: perSize, skip: position})
    position += perSize
  }
  return arr
}

const getTypeObj = wordsDBType => {
  return {
    name: wordsDBType.name, 
    code: wordsDBType.code, 
    publishtime: wordsDBType.publishtime
  }
}

const getCategoryObj = wordsCategory => {
  return {
    name: wordsCategory.name,
    code: wordsCategory.code
  }
}


module.exports = router