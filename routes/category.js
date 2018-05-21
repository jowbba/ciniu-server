var router = require('express').Router()
var AV = require('leanengine')

const token = req => req.headers['x-lc-session']

// 查询相同name || code 的记录
const getSameName = (name, req) => {
  let nameQuery = new AV.Query('WordsCategoryInfo')
  nameQuery.equalTo('name', name)
  return nameQuery.find({ sessionToken: token(req) })
}

const getSameCode = (code, req) => {
  let codeQuery = new AV.Query('WordsCategoryInfo')
  codeQuery.equalTo('code', code)
  return codeQuery.find({ sessionToken: token(req) })
}

router.get('/', (req, res) => {
  let query = new AV.Query('WordsCategoryInfo')
  query.find({ sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage }))
})

router.post('/', (req, res) => {
  try {
    let { name, pCode, code } = req.body

    if (!name || typeof name !== 'string') return res.status(400).json({ message: 'name error' })
    // if (!pCode || typeof pCode !== 'number') return res.status(400).json({ message: 'pCode error' })
    if (!code || typeof code !== 'number') return res.status(400).json({ message: 'code error' })

    Promise.all([getSameName(name, req), getSameCode(code, req)]).then(result => {
      if (result.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name or code' })
      let Type = AV.Object.extend('WordsCategoryInfo')
      let type = new Type()

      type.save({ name, pCode, code }, { 
        sessionToken: token(req)
      }).then(result => {
        res.status(200).json(result)
      }, err => res.status(err.code).json({ message: err.rawMessage }))

    }).catch(e => res.status(400).json({ message: 'check params error'}))
    
  } catch(e) {
    console.log(e)
    res.status(500).json(e)
  }
})

router.patch('/:id', (req, res) => {
  let { name, pCode } = req.body
  if ( !name && !pCode ) return res.status(400).json({ message: 'param error'})
  if (name && typeof name !== 'string') return res.status(400).json({ message: 'name error' })
  if (pCode && typeof pCode !== 'number') return res.status(400).json({ message: 'pCode error' })

  let type = AV.Object.createWithoutData('WordsCategoryInfo', req.params.id)

  if (name) type.set('name', name)
  if (pCode) type.set('pCode', pCode)

  let promiseArr = []
  if (name) promiseArr.push(getSameName(name, req))

  Promise.all(promiseArr).then(result => {
    if (result.find(item => item.length > 0)) return res.status(400).json({ message: 'exist same name' })

    type.save({}, { sessionToken: token(req)}).then(result => {
      res.status(200).json(result)
    }, error => {
      res.status(error.code).json({ message: error.rawMessage })
    })
  }).catch(e => res.status(400).json({ message: 'check params error'}))
  
})

router.delete('/:id', (req, res) => {
  let type = AV.Object.createWithoutData('WordsCategoryInfo', req.params.id)
  type.destroy({ sessionToken: token(req)}).then(result => {
    res.status(200).json(result)
  }, error => res.status(err.code).json({ message: err.rawMessage })
  )
})

module.exports = router