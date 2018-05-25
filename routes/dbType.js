var router = require('express').Router()
var AV = require('leanengine')

const token = req => req.headers['x-lc-session']

// 查询相同name || code 的记录
const getSameName = (name, req) => {
  let nameQuery = new AV.Query('WordsDBTypeInfo')
  nameQuery.equalTo('name', name)
  return nameQuery.find({ sessionToken: token(req) })
}

const getSameCode = (code, req) => {
  let codeQuery = new AV.Query('WordsDBTypeInfo')
  codeQuery.equalTo('code', code)
  return codeQuery.find({ sessionToken: token(req) })
}

// 查询所有type
router.get('/', (req, res) => {
  let query = new AV.Query('WordsDBTypeInfo')
  query.find({ sessionToken: token(req) }).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage })
  )
})

// 创建type
router.post('/', (req, res) => {
  try {
    let { name, version, code, publishtime } = req.body
    if (!name || typeof name !== 'string') return res.status(400).json({ message: 'name error' })
    if (!version || typeof version !== 'number') return res.status(400).json({ message: 'version error' })
    if (!code || typeof code !== 'number') return res.status(400).json({ message: 'code error' })
    if (publishtime && typeof publishtime !== 'string') return res.status(400).json({ message: 'publishtime should be string'})

    Promise.all([getSameName(name, req), getSameCode(code, req)]).then(result => {
      if (result.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name or code' })
      let Type = AV.Object.extend('WordsDBTypeInfo')
      let type = new Type()
      type.save({ name, version, code, publishtime }, {
        sessionToken: token(req) // 用户token
        // todo 根据条件进行存储
      }).then(result => {
        res.status(200).json(result)
      }, err => res.status(err.code).json({ message: err.rawMessage }))
    }).catch(e => res.status(400).json({ message: 'check params error'}))

  } catch (e) {
    res.status(500).json(e)
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

    type.save({},{ sessionToken: token(req) }).then(result => {
      res.status(200).json(result)
    }, error => {
      console.log('error', error, error.rawMessage)
      res.status(400).json({ message: error.rawMessage })
    })

  }).catch(e => res.status(400).json({ message: 'check params error'}))
  
})

router.delete('/:id', (req, res) => {
  let type = AV.Object.createWithoutData('WordsDBTypeInfo', req.params.id)
  type.destroy({ sessionToken: token(req) }).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage })
  )
})

module.exports = router