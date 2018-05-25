var router = require('express').Router()
var AV = require('leanengine')

/**
 *
 word 模块提供词查询功能
 *
 @module Word
*/

const token = req => req.headers['x-lc-session']

// 查询相同name || code 的记录
const getSameName = (name, req) => {
  let nameQuery = new AV.Query('ContrabandWordsInfo')
  nameQuery.equalTo('name', name)
  return nameQuery.find({ sessionToken: token(req) })
}

const getSameCode = (code, req) => {
  let codeQuery = new AV.Query('ContrabandWordsInfo')
  codeQuery.equalTo('code', code)
  return codeQuery.find({ sessionToken: token(req) })
}

// 创建词
router.post('/', (req, res) => {
  try {
    let { name, marks, code } = req.body
    if (!name || typeof name !== 'string') return res.status(400).json({ message: 'name error' })
    // if (!marks || typeof marks !== 'string') return res.status(400).json({ message: 'marks error' })
    if (!code || typeof code !== 'number') return res.status(400).json({ message: 'code error' })

    let Word = AV.Object.extend('ContrabandWordsInfo')
    let word = new Word()

    Promise.all([getSameName(name, req), getSameCode(code, req)]).then(result => {
      if (result.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name or code' })
      word.save({ name, marks, code }, { sessionToken: token(req)}).then(result => {
        res.status(200).json(result)
      }, error => res.status(500).json({ message: err.rawMessage }))
    }).catch(e => res.status(400).json({ message: 'check params error'}))

  } catch (e) {
    console.log(e)
    res.status(500).json(e)
  }
})

// 创建词关系
router.post('/relation', (req, res) => {
  // AV.User.become(req.headers['x-lc-session']).then( user => {
  //   console.log(user)
  // })
  let { typeCode, wordCode, categoryCode } = req.body
  if (!typeCode || !wordCode || !categoryCode) return res.status(400).json({ message: 'params error'})
  if (typeof typeCode !== 'number') return res.status(400).json({ message: 'typeCode should be number'})
  if (typeof wordCode !== 'number') return res.status(400).json({ message: 'wordCode should be number'})
  if (typeof categoryCode !== 'number') return res.status(400).json({ message: 'categoryCode should be number'})

  let c = { sessionToken: token(req) }

  let typeQuery = new AV.Query('WordsDBTypeInfo')
  typeQuery.equalTo('code', typeCode)

  let wordQuery = new AV.Query('ContrabandWordsInfo')
  wordQuery.equalTo('code', wordCode)

  let categoryQuery = new AV.Query('WordsCategoryInfo')
  categoryQuery.equalTo('code', categoryCode)

  let promiseArr = [typeQuery.find(c), wordQuery.find(c), categoryQuery.find(c)]

  // 根据code 查询id
  Promise.all(promiseArr).then(results => {

    // 检查id
    if (results.find(item => item.length !== 1)) return res.status(400).json({ message: 'check params error'})

    let wordsDBType = AV.Object.createWithoutData('WordsDBTypeInfo', results[0][0].id)
    let contrabandWords = AV.Object.createWithoutData('ContrabandWordsInfo', results[1][0].id)
    let wordsCategory = AV.Object.createWithoutData('WordsCategoryInfo', results[2][0].id)
    
    // 查询是否存在相同关系
    let query = new AV.Query('WordsRelationInfo')
    query.equalTo('wordsDBType', wordsDBType)
    query.equalTo('contrabandWords', contrabandWords)
    query.equalTo('wordsCategory', wordsCategory)
    
    query.find(c).then(sameRaw => {
      if (sameRaw.length > 0) return res.status(400).json({ message: 'exist same raw'})

      let Relation = AV.Object.extend('WordsRelationInfo')
      let relation = new Relation()

      relation.save({wordsDBType, contrabandWords, wordsCategory}, c).then(result => {
        res.status(200).json(result)
      }, error => res.status(500).json({ message: err.rawMessage }))

    })
    
  }).catch(e => {
    console.log(e)
    res.status(400).json({ message: 'check params error'})
  })

})

// 删除词
router.delete('/:id', (req, res) => {
  let type = AV.Object.createWithoutData('ContrabandWordsInfo', req.params.id)
  type.destroy({ sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage }))
})

// 更新词
router.patch('/:id', (req, res) => {
  let { name, marks, wordsDBTypeID, wordsCategoryID} = req.body

  if (name && typeof name !== 'string') return res.status(400).json({ message: 'name error' })
  if (marks && typeof marks !== 'string') return res.status(400).json({ message: 'marks error' })

  let word = AV.Object.createWithoutData('ContrabandWordsInfo', req.params.id)

  if (name) word.set('name', name)
  if (marks) word.set('marks', marks)

  let promiseArr = []
  if (name) promiseArr.push(getSameName(name, req))

  Promise.all(promiseArr).then(result => {
    if (result.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name' })

    word.save({}, {sessionToken: token(req)}).then(result => {
      res.status(200).json(result)
    }, error => {
      console.log('error', error, error.rawMessage)
      res.status(400).json({ message: error.rawMessage })
    })

  }).catch(e => res.status(400).json({ message: 'check params error'}))

})

// 查询词
router.get('/', (req, res) => {
  let count, { limit, skip } = req.query
  let query = new AV.Query('ContrabandWordsInfo')
  query.count({sessionToken: token(req)}).then(result => {
    count = result
    if (limit) query.limit(limit)
    if (skip) query.skip(skip)
    return query.find({sessionToken: token(req)})
  }).then(result => {
    res.status(200).json({count, data: result})
  }, error => res.status(err.code).json({ message: err.rawMessage }))
})

module.exports = router