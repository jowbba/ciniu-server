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

router.post('/', (req, res) => {
  try {
    let { name, marks, code, wordsDBTypeID, wordsCategoryID } = req.body
    if (!name || typeof name !== 'string') return res.status(400).json({ message: 'name error' })
    if (!marks || typeof marks !== 'string') return res.status(400).json({ message: 'marks error' })
    if (!code || typeof code !== 'number') return res.status(400).json({ message: 'code error' })

    if (wordsDBTypeID && !Array.isArray(wordsDBTypeID)) 
      return res.status(400).json({ message: 'wordsDBTypeID should be array'})

    if (wordsCategoryID && !Array.isArray(wordsCategoryID)) 
      return res.status(400).json({ message: 'wordsCategoryID should be array'})

    let Word = AV.Object.extend('ContrabandWordsInfo')
    
    let typeArr = [], categoryArr = []

    if (wordsDBTypeID) typeArr = wordsDBTypeID.map(item => 
      AV.Object.createWithoutData('WordsDBTypeInfo', item))

    if (wordsCategoryID) categoryArr = wordsCategoryID.map(item => 
      AV.Object.createWithoutData('WordsCategoryInfo', item))
    
    let word = new Word()

    Promise.all([getSameName(name, req), getSameCode(code, req)]).then(result => {
      if (result.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name or code' })
      word.save({ name, marks, code, typeArr, categoryArr }, { sessionToken: token(req)}).then(result => {
        res.status(200).json(result)
      }, error => res.status(500).json({ message: err.rawMessage }))
    }).catch(e => res.status(400).json({ message: 'check params error'}))

  } catch (e) {
    console.log(e)
    res.status(500).json(e)
  }
})

router.get('/', (req, res) => {
  let count, { limit, skip } = req.query
  let query = new AV.Query('ContrabandWordsInfo')
  query.include('typeArr')
  query.include('categoryArr')
  query.count({sessionToken: token(req)}).then(result => {
    count = result
    if (limit) query.limit(limit)
    if (skip) query.skip(skip)
    return query.find({sessionToken: token(req)})
  }).then(result => {
    res.status(200).json({count, data: result})
  }, error => res.status(err.code).json({ message: err.rawMessage }))
})

router.delete('/:id', (req, res) => {
  let type = AV.Object.createWithoutData('ContrabandWordsInfo', req.params.id)
  type.destroy({ sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage }))
})

router.patch('/:id', (req, res) => {
  let { name, marks, wordsDBTypeID, wordsCategoryID} = req.body

  if (name && typeof name !== 'string') return res.status(400).json({ message: 'name error' })
  if (marks && typeof marks !== 'string') return res.status(400).json({ message: 'marks error' })

  let word = AV.Object.createWithoutData('ContrabandWordsInfo', req.params.id)
  let typeArr = [], categoryArr = []

  if (wordsDBTypeID && !Array.isArray(wordsDBTypeID)) 
    return res.status(400).json({ message: 'wordsDBTypeID should be array'})

  if (wordsCategoryID && !Array.isArray(wordsCategoryID)) 
    return res.status(400).json({ message: 'wordsCategoryID should be array'})

  if (wordsDBTypeID) typeArr = wordsDBTypeID.forEach(item => 
    AV.Object.createWithoutData('WordsDBTypeInfo', item)
  )

  if (wordsCategoryID) categoryArr = wordsCategoryID.forEach(item => 
    AV.Object.createWithoutData('wordsCategoryID', item))

  if (name) word.set('name', name)
  if (marks) word.set('marks', marks)
  if (wordsDBTypeID) word.set('typeArr', typeArr)
  if (wordsCategoryID) word.set('categoryArr', categoryArr)

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






module.exports = router