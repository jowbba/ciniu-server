var router = require('express').Router()
var AV = require('leanengine')

const token = req => req.headers['x-lc-session']

router.get('/', (req, res) => {
  let query = new AV.Query('WordsDBTypeInfo')
  query.find({ sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => {
    return res.status(err.code).json({ message: err.rawMessage })
  })
})

router.post('/', (req, res) => {
  let { name, version } = req.body
  if (!name || !version) return res.status(400).json({ message: 'param error' })
  let Type = AV.Object.extend('WordsDBTypeInfo')
  let type = new Type()
  type.save({ name, version }, { sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, err => {
    return res.status(err.code).json({ message: err.rawMessage })
  })
})

router.delete('/:id', (req, res) => {
  let type = AV.Object.createWithoutData('WordsDBTypeInfo', req.params.id)
  type.destroy({ sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => {
    return res.status(err.code).json({ message: err.rawMessage })
  })
})

router.patch('/:id', (req, res) => {
  let { name, version } = req.body
  if ( !name && !version ) return res.status(400).json({ message: 'param error'})
  let type = AV.Object.createWithoutData('WordsDBTypeInfo', req.params.id)
  if (name) type.set('name', name)
  if (version) type.set('version', version)
  type.save({name, version}, { sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => {
    return res.status(err.code).json({ message: err.rawMessage })
  })
})

module.exports = router