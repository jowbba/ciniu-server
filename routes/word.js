var router = require('express').Router()
var AV = require('leanengine')

/**
 *
 word 模块提供词查询功能
 *
 @module Word
*/

const token = req => req.headers['x-lc-session']

router.post('/', (req, res) => {
  let { name, marks, wordsDBTypeID, wordsCategoryID } = req.body
  if (!name || !marks )
    return res.status(400).json({ message: 'param error'})
  // if (!wordsDBTypeID || !Array.isArray(wordsDBTypeID))
  //   return res.status(400).json({ message: 'param error'})
  // if (!wordsCategoryID || !Array.isArray(wordsCategoryID))
  //   return res.status(400).json({ message: 'param error'})

  let Word = AV.Object.extend('ContrabandWordsInfo')
  
  let typeArr = [], categoryArr = []

  if (wordsDBTypeID.length) typeArr = wordsDBTypeID.map(item => 
    AV.Object.createWithoutData('WordsDBTypeInfo', item))

    if (wordsCategoryID.length) categoryArr = wordsCategoryID.map(item => 
    AV.Object.createWithoutData('WordsCategoryInfo', item))

  let word = new Word()

  word.save({ name, marks, typeArr, categoryArr }, { sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage }))
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
  }, error => res.status(err.code).json({ message: err.rawMessage })
  )
})

router.patch('/:id', (req, res) => {
  
})






module.exports = router