var router = require('express').Router()
var AV = require('leanengine')
var crypto = require('crypto')
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
    let { toAccountWords } = req.user
    let { image, recognize_granularity, vertexes_location, fileName, taskId } = req.body
    let { username } = user.attributes
    let options = {}
    let needToUpload = true
    let needToConsume = true
    let needToQuery = true
    let fileResult
    let url 
    let result
    let pointsToConsume = 8
    let actualPoints = pointsToConsume
    let describe = '用户查询图片 扣点8'
    // 检查参数
    if (user.attributes.points < 8) throw createErr('points is not enough', 403)
    if (!image) throw createErr('image is required', 400)
    if (typeof image !== 'string') throw createErr('image should be base64',400)
    if (recognize_granularity && !(['small', 'big'].includes(recognize_granularity))) 
      throw createErr('recognize_granularity should be small or big', 400)
    if (vertexes_location && !(['true', 'false'].includes(vertexes_location))) 
      throw createErr('vertexes_location should be Boolean value of string type', 400)

    // 计算hash
    let buf = Buffer.from(image, 'base64')
    let cryptoHash = crypto.createHash('sha256')
    let hash = cryptoHash.update(buf).digest('hex')

    // 查找相同文件
    let fileQuery = new AV.Query('_file')
    fileQuery.equalTo('name', hash)
    let sameFiles = await fileQuery.count({useMasterKey: true})
    needToUpload = sameFiles == 0? true: false

    
    if (needToUpload) {
      // 没找到相同文件 -> 存储文件
      console.log('没找到相同文件 -> 存储文件')
      let data = { base64: image }
      let file = new AV.File(hash, data)
      file.metaData('owner', user.id)
      fileResult = await file.save()
      url = fileResult.url()
    } else {
      console.log('找到相同文件')
      // 找到相同文件 -> 查找记录
      let ocrQuery = new AV.Query('OcrRecord')
      ocrQuery.equalTo('hash', hash)
      let sameHashOcr = await ocrQuery.first({useMasterKey: true})
      ocrQuery.equalTo('user', user)
      let sameHashAndUserOcr = await ocrQuery.first({useMasterKey: true})
      
      if ( !sameHashOcr && !sameHashAndUserOcr) {
        console.log('没有找到OCR记录')
      } else if ( !!sameHashAndUserOcr) {
        console.log('找到相同OCR 且用户相同记录 不扣点')
        needToQuery = false
        needToConsume = false
        fileResult = sameHashAndUserOcr.attributes.file
        result = sameHashAndUserOcr.attributes.result
        url = sameHashAndUserOcr.attributes.url
      } else if ( !!sameHashOcr) {
        console.log('找到相同OCR 但不是本用户记录 扣点')
        needToQuery = false
        needToConsume = true
        fileResult = sameHashOcr.attributes.file
        result = sameHashOcr.attributes.result
        url = sameHashOcr.attributes.url
      }
    }

    // console.log(user)

    // 请求ocr
    if (needToQuery) {
      if (vertexes_location) options.vertexes_location = vertexes_location
      if (recognize_granularity) options.recognize_granularity = recognize_granularity
      result = await client.accurate(image, options)
    }

    // 记录图片信息
    let OcrRecord = AV.Object.extend('OcrRecord')
    let ocrRecord = new OcrRecord()
    await ocrRecord.save({ hash, url, file: fileResult, result, user }, { sessionToken })

    // 扣除用户点数
    if ( !needToConsume ) {
      actualPoints = 0
      describe += ' 用户存在相同文件 无需扣点'
    }
    user.increment('points', -actualPoints)
    await user.save(null, {
      query: new AV.Query(AV.User).greaterThanOrEqualTo('points', 8),
      useMasterKey: true
    })

    // 记录消费
    let Record = AV.Object.extend('PointConsume')
    let record = new Record()
    
    await record.save({ 
      username, pointsToConsume, actualPoints, describe, count: 0, type: 'image', hash, toAccountWords, fileName, taskId }, 
      { sessionToken })

    res.status(200).json(result)

  } catch (e) {
    console.log(e)
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
})

module.exports = router