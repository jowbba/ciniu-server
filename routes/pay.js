var fs = require('fs')
var path = require('path')
var router = require('express').Router()
var AV = require('leanengine')
var AlipaySdk = require('alipay-sdk').default
var AlipayFormData = require('alipay-sdk/lib/form').default
var { getAllRelations, createErr } = require('./lib')

const Alipay = require('alipay-node-sdk');

const appId = '2016091400507187'
// const privateKey = fs.readFileSync(path.join(__dirname, '../RSA密钥/应用私钥2048.txt'), 'utf-8')
// const alipayPublicKey = fs.readFileSync(path.join(__dirname, '../RSA密钥/支付宝公钥.txt'), 'utf-8')
const gateway = 'https://openapi.alipay.com/gateway.do'
// const AlipaySdkConfig = { appId, privateKey, alipayPublicKey, gateway }
// const alipaySdk = new AlipaySdk(AlipaySdkConfig);

var ali = new Alipay({
  appId: '2018062760432332',
  notifyUrl: 'http://ciniu.leanapp.cn/pay/notify',
  rsaPrivate: path.join(__dirname, './RSA/2.txt'),
  rsaPublic: path.join(__dirname, './RSA/3.txt'),
  sandbox: false,
  signType: 'RSA2'
});

router.post('/', async (req, res) => {
  
  try {
    let user = await AV.User.become(req.headers['x-lc-session'])
    let { types, pointIndex } = this.req
    if (!user) throw createErr('user is not login', 403)
    if (types.length == 0 && pointIndex == -1) throw createErr('pay content is empty')
    if (!types) throw createErr('types is required', 400)
    if (!pointIndex || (typeof pointIndex) !== 'number') throw createErr('pointIndex is required')
    if (!pointList[pointIndex]) throw createErr('point type not found')
    let { price, points, roles } = createTrade(types, pointIndex)

    var params = ali.pagePay({
      subject: '测试商品',
      body: '测试商品描述',
      outTradeId: '123abcdeFaa',
      timeout: '10m',
      amount: '0.01',
      goodsType: '0',
      qrPayMode: 2
  });
  
  let url = gateway + '?' + params

  res.status(200).json({ url })
  } catch (e) {
    res.status(e.code? e.code: 500).json({ message: e.message })
  }

})

router.post('/notify', (req, res) => {
  console.log('in notify', req.body)
  let { out_trade_no } = req.body
})

const createTrade = (types, pointIndex) => {
  let price = 0
  let points = 0
  let roles = []
  types.forEach(type => {
    let obj = typeList
  })



  if (pointIndex !== -1) {
    points = pointList[pointIndex].count
    price += pointList[pointIndex].price
  }
}

const pointList = [
  {price: 50, count: '5,000'},
  {price: 98, count: '10,000'},
  {price: 180, count: '20,000'},
  {price: 350, count: '40,000'},
  {price: 1000, count: '120,000'},
]

const typeList = [
  { name: '词牛违禁词软件', roleName: 'Vip', price: 1000, days: 365}
]





module.exports = router