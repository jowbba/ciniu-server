/*
 * @Author: harry.liu 
 * @Date: 2018-08-16 11:54:36 
 * @Last Modified by: harry.liu
 * @Last Modified time: 2018-08-17 18:16:35
 * @function : 条款类目
 */

const router = require('express').Router()
const AV = require('leanengine')
const Joi = require('joi')
const { split, getTypes, getTypeWithId, getClauseWithId, 
  getWordWithId, getSameWordRelation, getSettingByUser } = require('./lib')
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
    let options = { clauseId, description, type, typeName: type.attributes.typeName }
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
    wordId: Joi.string().allow(''), 
    name: Joi.string().min(1).required(),
    sensitive: Joi.boolean(),
    official: Joi.boolean(),
    comment: Joi.string().allow('')
  }
}), async (req, res) => {
  try {
    let { user, sessionToken } = req
    let { wordId, name, sensitive, official, comment } = req.body
    
    // 判断是否为官方词
    official = official || false
    if (official) {
      let roles = await user.getRoles()
      let isManager = !!roles.find(item => item.attributes.name == 'Manager')
      if (!isManager) return res.error('user can not create official word', 403)
      if (!wordId) return res.error('wordId is required')
      let sameIdWord = await getWordWithId(wordId)
      if (sameIdWord) return res.error('exist same wordId')
    } else {
      let wordQuery = new AV.Query('Word')
      wordQuery.equalTo('user', user)
      wordQuery.equalTo('name', name)
      let sameNameWord = await wordQuery.first({ sessionToken })
      if (sameNameWord) return res.error('exist same name custom word')
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

router.patch('/word/id', async (req, res) => {
  
} )

// 查询所有词
router.get('/word', basicVer, async (req, res) => {
  try {
    let { user, sessionToken } = req
    console.time('setting')
    let setting = await getSettingByUser(user)
    console.timeEnd('setting')
    let { notSelectedType, customActive } = setting.attributes
    // 获取不需要的type
    console.time('type')
    let types = []
    let typeConditions = notSelectedType.map(typeId => {
      let typeQuery = new AV.Query('WordsType')
      typeQuery.equalTo('typeId', typeId)
      return typeQuery
    })

    if (typeConditions.length) {
      let typeQuery = AV.Query.or(...typeConditions)
      types = await typeQuery.find({sessionToken}) 
    }

    console.timeEnd('type')

    // 获取需要的条款
    console.time('clause')
    let clauses = []
    let clauseCondition = types.map(type => {
      let clauseQuery = new AV.Query('WordsLawClause')
      clauseQuery.notEqualTo('type', type)
      return clauseQuery
    })

    if (clauseCondition.length) {
      let clauseQuery = AV.Query.and(...clauseCondition)
      clauses = await clauseQuery.find({sessionToken})
    } else {
      let clauseQuery = new AV.Query('WordsLawClause')
      clauses = await clauseQuery.find({sessionToken})
    }

    console.timeEnd('clause')

    // 查询需要的词
    console.time('get words')

    let relationCondition = clauses.map(clause => {
      let relationQuery = new AV.Query('WordsRelation')
      relationQuery.equalTo('clauses', clause)
      return relationQuery
    })

    let relationQuery = AV.Query.or(...relationCondition)
    relationQuery.include('word')
    let relationCount = await relationQuery.count({sessionToken})

    let splitArr = split(relationCount, 100)
    let queryArr = splitArr.map(item => {
      relationQuery.limit(item.limit)
      relationQuery.skip(item.skip)
      relationQuery.include('word')
      relationQuery.descending('createdAt')
      return relationQuery.find({sessionToken})
    })

    let words = []

    for(let i = 0; i < queryArr.length; i++) {
      let result = await queryArr[i]
      result.forEach(item => {
        let { word } = item.attributes 
        let { id } = word
        let { name } = word.attributes
        words.push({ id, name })
      })
    }
    console.timeEnd('get words')
    
    // words.forEach(item => console.log(item))

    // 查询自定义词
    let custom = []
    console.time('custom')
    
    if (customActive) {
      let customWordQuery = new AV.Query('Word')
      customWordQuery.equalTo('user', user)
      let customWordCount = await customWordQuery.count({sessionToken})
      let splitArrWord = split(customWordCount, 100)

      let customQueryArr = splitArr.map(item => {
        customWordQuery.limit(item.limit)
        customWordQuery.skip(item.skip)
        customWordQuery.descending('createdAt')
        return customWordQuery.find({sessionToken})
      })

      for(let i = 0; i < customQueryArr.length; i++) {
        let result = await customQueryArr[i]
        result.forEach(item => {
          let { id } = item
          let { name } = item.attributes
          custom.push({ id, name})
        })
      }
    }

    console.timeEnd('custom')
    console.log(`Get all word finish, official words : ${words.length}
      custom words : ${custom.length}`)


    res.success(words.concat(custom))
  } catch (e) {
    console.log('error in get relation', e)
    res.error(e)
  }

})

// 创建词与条款关系
router.post('/relation', rootVer, joiValidator({
  body: {
    wordId: Joi.string().required(),
    clauseIds: Joi.array().required()
  }
}), async (req, res) => {
  try {
    let { user, sessionToken } = req
    let { wordId, clauseIds } = req.body
    let word = await getWordWithId(wordId)
    if (!word) return res.error(`wordId : ${wordId} is not exist`)
    let clauses = []
    for(let i = 0; i < clauseIds.length; i++) {
      let clause = await getClauseWithId(clauseIds[i])
      if (!clause) return res.error(`clause id : ${clauseIds[i]} is not exist `)
      else clauses.push(clause)
    }

    let newRelation
    // 相同word 是否存在
    let sameWordIdRelation = await getSameWordRelation(word)
    if (sameWordIdRelation) {
      console.log('exist same wordId relation --> update')
      // 更新
      clauses.forEach(clause => sameWordIdRelation.addUnique('clauses', clause))
      newRelation = await sameWordIdRelation.save({}, { sessionToken })
    } else {
      console.log('not exist same wordId relation --> insert')
      // 插入
      let WordRelation = AV.Object.extend('WordsRelation')
      let wordRelation = new WordRelation()
      let options = { word, clauses }
      newRelation = await wordRelation.save(options, { sessionToken })
    }
    
    res.success(newRelation)
    
  } catch (e) {
    console.log('error in get word', e.message)
    res.error(e)
  }
})

// 查询词的类目或解释
router.get('/word/:id', basicVer, async (req, res) => {
  try {
    let { user, sessionToken } = req
    let { id } = req.params
    let wordQuery = new AV.Query('Word')
    wordQuery.equalTo('objectId', id)
    let word = await wordQuery.first({ sessionToken })
    if (!word) return res.error('not exist')
    let { official, comment, name, sensitive } = word.attributes
    // console.log(word.attributes)
    let result = []
    if (official) {
      // 查询词对应条款
      let relationQuery = new AV.Query('WordsRelation')
      relationQuery.equalTo('word', word)
      relationQuery.include('clauses')
      let relation = await relationQuery.first({ sessionToken })
      relation.attributes.clauses.forEach(item => {
        let { description, typeName } = item.attributes
        result.push({ name, sensitive, data: description, official, typeName })
      })
    } else {
      // 自建词 不包含条款
      result.push({ name, sensitive, data: comment, official, typeName: ''})
    }
    
    res.success(result)

  } catch (e) {
    console.log('error in get word info', e.message)
    res.error(e)
  }
})


module.exports = router

