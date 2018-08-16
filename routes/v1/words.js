/*
 * @Author: harry.liu 
 * @Date: 2018-08-16 11:54:36 
 * @Last Modified by: harry.liu
 * @Last Modified time: 2018-08-16 19:05:39
 * @function : 条款类目
 */

const router = require('express').Router()
const AV = require('leanengine')
const Joi = require('joi')
const { getTypes, getTypeWithId, getClauseWithId, getWordWithId } = require('./lib')
const { rootVer, basicVer } = require('./middleware')
const joiValidator = require('../../middleware/joiValidator')


// 创建类目
router.post('/type', rootVer, joiValidator({
  body: {
    typeName: Joi.string().min(1).required(),
    typeId: Joi.string().min(1).required()
  }
}), async (req, res) => {
  try {
    let { sessionToken } = req
    let { typeId, typeName } = req.body
    // 查询相同type
    let typeNameQuery = new AV.Query('WordsType')
    typeNameQuery.equalTo('typeName', typeName)
    let sameNameCount = await typeNameQuery.count({ sessionToken })
    let sameIdType = await getTypeWithId(typeId)
    if (sameIdType || sameNameCount !== 0) return res.error(new Error('exist same raw'))

    // 插入
    let Type = AV.Object.extend('WordsType')
    let type = new Type()
    let options = { typeId, typeName }
    let newType = await type.save(options, { sessionToken })
    res.success(newType)
  } catch (e) {
    console.log('error in post type', e)
    res.error(e)
  }

})

// 查询类目
router.get('/type', basicVer, async (req, res) => {
  try {
    let data = await getTypes()
    res.success(data)
  } catch (e) {
    console.log('error in get type', e)
    res.error(e)
  }
})

// 创建条款
router.post('/lawClause', rootVer, joiValidator({
  body: {
    clauseId: Joi.string().min(1).required(),
    description: Joi.string().required(),
    typeId: Joi.string().min(1).required()
  }
}), async (req, res) => {
  try {
    let { sessionToken } = req
    let { clauseId, description, typeId } = req.body
    // 查询相同clause 以及对应type
    let type = await getTypeWithId(typeId)
    let sameIdClause = await getClauseWithId(clauseId)
    if (!type) return res.error('typeId not exist')
    if (sameIdClause) return res.error('exist same clauseId')

    // 插入
    let Clause = AV.Object.extend('WordsLawClause')
    let clause = new Clause()
    let options = { clauseId, description, type }
    let newClause = await clause.save(options, { sessionToken })
    
    res.success(newClause)
  } catch (e) {
    console.log('error in post clause', e)
    res.error(e)
  }
})

// 创建词
router.post('/word', basicVer, joiValidator({
  body: {
    wordId: Joi.string().min(1).required(), 
    name: Joi.string().min(1).required(),
    sensitive: Joi.boolean(),
    official: Joi.boolean(),
    comment: Joi.string().allow('')
  }
}), async (req, res) => {
  try {
    let { user, sessionToken } = req
    let { wordId, name, sensitive, official, comment } = req.body
    let sameIdWord = await getWordWithId(wordId)
    if (sameIdWord) return res.error('exist same wordId')

    // 判断是否为官方词
    official = official || false
    if (official) {
      let roles = await user.getRoles()
      let isManager = !!roles.find(item => item.attributes.name == 'Manager')
      if (!isManager) return res.error('user can not create official word', 403)
    }

    // 插入
    let Word = AV.Object.extend('Word')
    let word = new Word()
    let options = { wordId, name, sensitive, official, user, comment}
    let newWord = await word.save(options, { sessionToken })

    res.success('')
  } catch (e) {
    console.log('error in post word', e)
    res.error(e)
  }
  
})

router.get('/word', basicVer, async () => {
  // AV.Query.or()
})

// 创建词与条款关系
router.post('/relation', rootVer, joiValidator({
  body: {
    wordId: Joi.string().required(),
    clauses: Joi.array().required()
  }
}), async () => {
  try {
    let sameIdWordRelation = AV.Query
    
  } catch (e) {
    console.log('error in post relation', e)
    res.error(e)
  }
})


module.exports = router

