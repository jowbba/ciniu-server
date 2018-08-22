/*
 * @Author: harry.liu 
 * @Date: 2018-08-16 11:54:36 
 * @Last Modified by: harry.liu
 * @Last Modified time: 2018-08-22 15:17:39
 * @function : 条款类目
 */

const router = require('express').Router()
const AV = require('leanengine')
const Joi = require('joi')
const { split, getTypes, getTypeWithId, getClauseWithId,
  getWordWithId, getSameWordRelation, getSettingByUser, getWords } = require('./lib')
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

// 点赞
router.post('/lawClause/thumbUp', async (req, res) => {
  let { clauseId } = req.body
  let 
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
    let options = { wordId, name, sensitive, official, user, comment }
    let newWord = await word.save(options, { sessionToken })

    res.success('')
  } catch (e) {
    console.log(`error in post word ${req.body.wordId}`, e)
    res.error(e)
  }

})

// 删除词
router.delete('/word/:id', basicVer, async (req, res) => {
  try {
    let { sessionToken } = req
    let { id } = req.params
    let obj = AV.Object.createWithoutData('Word', id)
    let result = await obj.destroy({ sessionToken })
    res.success(result)
  } catch (e) {
    console.log('error in delete word', e.message)
    res.error(e)
  }
})

// 更新词
router.patch('/word/:id', basicVer, joiValidator({
  body: {
    name: Joi.string().min(1).required(),
    comment: Joi.string().allow('')
  }
}), async (req, res) => {
  try {
    let { sessionToken, user } = req
    let { id } = req.params
    let { name, comment } = req.body

    // 获取词
    let wordQuery = new AV.Query('Word')
    wordQuery.equalTo('objectId', id)
    let word = await wordQuery.first({ useMasterKey: true })
    if (!word) return res.error('word not exist')

    // 查询相同词
    let sameWordQuery = new AV.Query('Word')
    sameWordQuery.equalTo('user', user)
    sameWordQuery.equalTo('name', name)
    sameWordQuery.notEqualTo('objectId', id)
    let sameNameWord = await sameWordQuery.first({ sessionToken })
    if (sameNameWord) return res.error('exist same name custom word')

    let result = await word.save({ user, name, comment }, { sessionToken })

    res.success(result)

  } catch (e) {
    console.log('error in patch word', e.message)
    res.error(e)
  }
})

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
      types = await typeQuery.find({ sessionToken })
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
      clauses = await clauseQuery.find({ sessionToken })
    } else {
      let clauseQuery = new AV.Query('WordsLawClause')
      clauses = await clauseQuery.find({ sessionToken })
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
    let relationCount = await relationQuery.count({ sessionToken })

    let splitArr = split(relationCount, 1000)
    let queryArr = splitArr.map(item => {
      relationQuery.limit(item.limit)
      relationQuery.skip(item.skip)
      relationQuery.include('word')
      relationQuery.descending('createdAt')
      return relationQuery.find({ sessionToken })
    })

    let words = []

    for (let i = 0; i < queryArr.length; i++) {
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
      let customWordCount = await customWordQuery.count({ sessionToken })
      let splitArr = split(customWordCount, 1000)
      let customQueryArr = splitArr.map(item => {
        customWordQuery.limit(item.limit)
        customWordQuery.skip(item.skip)
        customWordQuery.descending('createdAt')
        return customWordQuery.find({ sessionToken })
      })

      for (let i = 0; i < customQueryArr.length; i++) {
        let result = await customQueryArr[i]
        result.forEach(item => {
          let { id } = item
          let { name } = item.attributes
          custom.push({ id, name })
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

router.get('/word/custom', basicVer, async (req, res) => {
  try {
    let custom = []
    let { user, sessionToken } = req
    let customWordQuery = new AV.Query('Word')
    customWordQuery.equalTo('user', user)
    let customWordCount = await customWordQuery.count({ sessionToken })
    let splitArr = split(customWordCount, 1000)

    let customQueryArr = splitArr.map(item => {
      customWordQuery.limit(item.limit)
      customWordQuery.skip(item.skip)
      customWordQuery.descending('createdAt')
      return customWordQuery.find({ sessionToken })
    })

    for (let i = 0; i < customQueryArr.length; i++) {
      let result = await customQueryArr[i]
      result.forEach(item => {
        let { id } = item
        let { name, comment } = item.attributes
        custom.push({ id, name, comment })
      })
    }

    res.success(custom)
  } catch (e) {
    console.log('error in get custom word', e)
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
    for (let i = 0; i < clauseIds.length; i++) {
      let clause = await getClauseWithId(clauseIds[i])
      if (!clause) return res.error(`clause id : ${clauseIds[i]} is not exist `)
      else clauses.push(clause)
    }

    let newRelation
    // 相同word 是否存在
    let sameWordIdRelation = await getSameWordRelation(word)
    if (sameWordIdRelation) {
      // console.log('exist same wordId relation --> update')
      // 更新
      clauses.forEach(clause => sameWordIdRelation.addUnique('clauses', clause))
      newRelation = await sameWordIdRelation.save({}, { sessionToken })
    } else {
      // console.log('not exist same wordId relation --> insert')
      // 插入
      let WordRelation = AV.Object.extend('WordsRelation')
      let wordRelation = new WordRelation()
      let options = { word, clauses }
      newRelation = await wordRelation.save(options, { sessionToken })
    }

    res.success(newRelation)

  } catch (e) {
    console.log(`error in post relation ${req.body.wordId}`, e.message)
    res.error(e)
  }
})

// 根据ID 查询词对应条款
router.get('/word/:id', basicVer, async (req, res) => {
  try {
    let { user, sessionToken } = req
    let { id } = req.params
    console.log(`id is : ${id}`)
    let wordQuery = new AV.Query('Word')
    wordQuery.equalTo('objectId', id)
    let word = await wordQuery.first({ sessionToken })
    if (!word) return res.error('not exist')
    let { official, comment, name, sensitive } = word.attributes
    
    let result = []
    if (official) {
      // 查询词对应条款
      let relationQuery = new AV.Query('WordsRelation')
      relationQuery.equalTo('word', word)
      relationQuery.include('clauses')
      let relation = await relationQuery.first({ sessionToken })
      relation.attributes.clauses.forEach(item => {
        let { description, typeName } = item.attributes
        result.push({ name, sensitive, data: description, official, typeName,  uTime: word.updatedAt })
      })
    } else {
      // 自建词 不包含条款
      result.push({ name, sensitive, data: comment, official, typeName: '', uTime: word.updatedAt})
    }

    res.success(result)


  } catch (e) {
    console.log('error in get word info', e.message)
    res.error(e)
  }
})

router.post('/freeQuery', joiValidator({
  body: {
    word: Joi.string().max(6).required()
  }
}), async (req, res) => {
  try {
    let { word } = req.body
    let words = getWords(word)
    let result = []
    // 查询条件
    let conditions = words.map(word => {
      let wordQuery = new AV.Query('Word')
      wordQuery.equalTo('official', true)
      wordQuery.equalTo('name', word.name)
      return wordQuery
    })

    let query = AV.Query.or(...conditions)
    let wordResult = await query.find({useMasterKey: true})
    // 排序
    wordResult.forEach(item => {
      let i = words.find(word => word.name == item.attributes.name)
      item.begin = i.begin
      item.length = i.length
    })
    wordResult.sort(by('begin', 'length'))

    // 未找到违禁词
    if (wordResult.length == 0) return res.error('该词未被收录')
    
    // 找到违禁词对应条款与类目
    for(let i of wordResult) {
      let { name, sensitive } = i.attributes
      let word = { name, clauses: []}
      // 敏感词 结束查询
      if (sensitive) return res.error('未能通过词牛的智能审核。')
      
      // 查询对应条款
      let relationQuery = new AV.Query('WordsRelation')
      relationQuery.equalTo('word', i)
      relationQuery.include('clauses')
      let relation = await relationQuery.first({ useMasterKey: true })
      relation.attributes.clauses.forEach(item => {
        let { description, typeName, clauseId, thumbUp } = item.attributes
        word.clauses.push({ description, typeName, clauseId, thumbUp })
      })

      result.push(word)
    }

    res.success(result)
  } catch (e) {
    console.log('error in get free word info', e.message)
    res.error('该词未被收录')
  }
})

var by = function(name,minor){
   return function(o,p){
     var a,b;
     if(o && p && typeof o === 'object' && typeof p ==='object'){
       a = o[name];
       b = p[name];
       if(a === b){
         return typeof minor === 'function' ? minor(o,p):0;
       }
       if(typeof a === typeof b){
         return a < b ? -1:1;
       }
       return typeof a < typeof b ? -1 : 1;
     }else{
       thro("error");
     }
   }
  }


module.exports = router

