var router = require('express').Router()
var AV = require('leanengine')
var AipOcrClient = require("baidu-aip-sdk").ocr
var { createErr } = require('./lib')

// 设置APPID/AK/SK
var APP_ID = "11424755";
var API_KEY = "iXqeG2aQzY4YTaEqEqnQGPeG";
var SECRET_KEY = "oi5NAKnLs3hNHXDOIRguSDVdzHgUg65A";

var client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY)

router.post('/', async (req, res) => {
  try {
    let user = await AV.User.become(req.headers['x-lc-session'])
    if (user.attributes.points < 4) throw createErr('points is not enough', 403)
    let { image, recognize_granularity, vertexes_location } = req.body
    let options = {}
    if (!image) throw createErr('image is required', 400)
    if (typeof image !== 'string') throw createErr('image should be base64',400)

    if (recognize_granularity && !(['small', 'big'].includes(recognize_granularity))) 
      throw createErr('recognize_granularity should be small or big', 400)
    

    if (vertexes_location && !(['true', 'false'].includes(vertexes_location))) 
      throw createErr('vertexes_location should be Boolean value of string type', 400)
    
    if (vertexes_location) options.vertexes_location = vertexes_location
    if (recognize_granularity) options.recognize_granularity = recognize_granularity

    let result = await client.accurate(image, options)

    user.increment('points', -8)
    await user.save(null, {
      query: new AV.Query(AV.User).greaterThanOrEqualTo('points', 1),
      useMasterKey: true
    })

    res.status(200).json(result)

  } catch (e) {
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
return
  
  

  




})

module.exports = router