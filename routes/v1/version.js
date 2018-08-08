var router = require('express').Router()
var AV = require('leanengine')
var { createErr } = require('./lib')


router.get('/', async (req, res) => {
  try {
    let apiQuery = new AV.Query('ApiVersion')
    apiQuery.descending('createdAt')
    let result = JSON.stringify(await apiQuery.first())
    

    res.status(200).json({result, state: true, code: 200, message: ''})

  } catch (e) {
    res.status(200).json({ message: e.message, state: false, result: '', code: 200 })
  }

})


module.exports = router