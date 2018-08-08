const express = require('express')
const router = express.Router()
var AV = require('leanengine');

// 重定向到 HTTPS
router.use(AV.Cloud.HttpsRedirect());

router.use('/user', require('./user'))

router.use('/token', require('./sessionToken'))

router.use('/word', require('./word'))

router.use('/type', require('./dbType'))

router.use('/category', require('./category'))

router.use('/ocr', require('./ocr'))

router.use('/pay', require('./pay'))

router.use('/version', require('./version'))

router.use('/consume', require('./consume'))

router.use('/query', require('./query'))

router.use('/setting', require('./setting'))


module.exports = router