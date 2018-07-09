var router = require('express').Router()
var AV = require('leanengine')
var { createErr } = require('./lib')


router.get('/', async (req, res) => {
  try {
    let version = '1.0.0.0'
    res.status(200).json({version})

  } catch (e) {
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }

})

module.exports = router