var router = require('express').Router()
var AV = require('leanengine')
var AipOcrClient = require("baidu-aip-sdk").ocr
var { createErr } = require('./lib')
var { basicVer } = require('./middleware')

// 设置APPID/AK/SK
var APP_ID = "11424755";
var API_KEY = "iXqeG2aQzY4YTaEqEqnQGPeG";
var SECRET_KEY = "oi5NAKnLs3hNHXDOIRguSDVdzHgUg65A";

var client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY)

router.post('/', basicVer, async (req, res) => {
  try {
    let { user, sessionToken } = req
    let { image, recognize_granularity, vertexes_location } = req.body
    let { username } = user.attributes
    let options = {}
    // 检查参数
    if (user.attributes.points < 8) throw createErr('points is not enough', 403)
    if (!image) throw createErr('image is required', 400)
    if (typeof image !== 'string') throw createErr('image should be base64',400)
    if (recognize_granularity && !(['small', 'big'].includes(recognize_granularity))) 
      throw createErr('recognize_granularity should be small or big', 400)
    if (vertexes_location && !(['true', 'false'].includes(vertexes_location))) 
      throw createErr('vertexes_location should be Boolean value of string type', 400)
    // 请求ocr
    if (vertexes_location) options.vertexes_location = vertexes_location
    if (recognize_granularity) options.recognize_granularity = recognize_granularity

    let result = await client.accurate(image, options)

    // 扣除用户点数
    let pointsToConsume = 8
    let actualPoints = pointsToConsume
    let describe = '用户查询图片 扣点8'
    user.increment('points', -actualPoints)
    await user.save(null, {
      query: new AV.Query(AV.User).greaterThanOrEqualTo('points', 8),
      useMasterKey: true
    })

    // 记录
    let Record = AV.Object.extend('PointConsume')
    let record = new Record()
    
    await record.save({ 
      username, pointsToConsume, actualPoints, describe, count: 0, type: 'image' }, 
      { sessionToken })

    res.status(200).json(result)

  } catch (e) {
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
})

module.exports = router