var router = require('express').Router()
var AV = require('leanengine')
var { createErr } = require('./lib')


router.get('/', async (req, res) => {
  try {
    let apiQuery = new AV.Query('ApiVersion')
    apiQuery.descending('createdAt')
    let result = await apiQuery.first()
    

    // res.status(200).json({code: 200, message: '', result, state: true})
    res.success(result)

  } catch (e) {
    res.error(e)
  }

})


module.exports = router