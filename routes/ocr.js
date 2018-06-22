var router = require('express').Router()
var AV = require('leanengine')
var AipOcrClient = require("baidu-aip-sdk").ocr;
// var fs = require('fs')

// 设置APPID/AK/SK
var APP_ID = "11424755";
var API_KEY = "iXqeG2aQzY4YTaEqEqnQGPeG";
var SECRET_KEY = "oi5NAKnLs3hNHXDOIRguSDVdzHgUg65A";

var client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY)

router.post('/', (req, res) => {
  let { image, recognize_granularity, vertexes_location } = req.body
  // image = fs.readFileSync('/home/liu/timg.jpeg').toString('base64')
  let options = {}
  if (!image) res.status(401).json({ message: 'image is required'})
  if (typeof image !== 'string') res.status(401).json({ message: 'image should be base64'})

  if (recognize_granularity && !(['true', 'false'].includes(recognize_granularity))) {
    res.status(401).json({ message: 'recognize_granularity should be Boolean value of string type '})
  }

  if (vertexes_location && !(['true', 'false'].includes(vertexes_location))) {
    res.status(401).json({ message: 'vertexes_location should be Boolean value of string type '})
  }

  if (vertexes_location) options.vertexes_location = vertexes_location
  if (recognize_granularity) options.recognize_granularity = recognize_granularity



client.accurate(image, options).then(result => {
  res.status(200).json(result)
}, err => {
  console.log(err)
})



})

module.exports = router