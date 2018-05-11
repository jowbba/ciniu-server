var router = require('express').Router()
var AV = require('leanengine')

const token = req => req.headers['x-lc-session']

router.get('/', (req, res) => {
  let query = new AV.Query('WordsCategoryInfo')
  query.find({ sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => {
    return res.status(err.code).json({ message: err.rawMessage })
  })
})

router.post('/', (req, res) => {
  let { name, pid } = req.body
  if (!name || !pid) return res.status(400).json({ message: 'param error' })
  let Type = AV.Object.extend('WordsCategoryInfo')
  let type = new Type()
  type.save({ name, pid }, { sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, err => {
    return res.status(err.code).json({ message: err.rawMessage })
  })
})

router.delete('/:id', (req, res) => {
  let type = AV.Object.createWithoutData('WordsCategoryInfo', req.params.id)
  type.destroy({ sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => {
    return res.status(err.code).json({ message: err.rawMessage })
  })
})

router.patch('/:id', (req, res) => {
  let { name, pid } = req.body
  if ( !name && !pid ) return res.status(400).json({ message: 'param error'})
  let type = AV.Object.createWithoutData('WordsCategoryInfo', req.params.id)
  if (name) type.set('name', name)
  if (pid) type.set('pid', pid)
  type.save({name, pid}, { sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => {
    res.status(err.code).json({ message: err.rawMessage })
  })
})

module.exports = router