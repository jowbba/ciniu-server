var fs = require('fs')
var path = require('path')
var router = require('express').Router()
var AV = require('leanengine')
var AlipaySdk = require('alipay-sdk').default
var AlipayFormData = require('alipay-sdk/lib/form').default
var { getAllRelations } = require('./lib')

const Alipay = require('alipay-node-sdk');

const appId = '2016091400507187'
// const privateKey = fs.readFileSync(path.join(__dirname, '../RSA密钥/应用私钥2048.txt'), 'utf-8')
// const alipayPublicKey = fs.readFileSync(path.join(__dirname, '../RSA密钥/支付宝公钥.txt'), 'utf-8')
const gateway = 'https://openapi.alipaydev.com/gateway.do'
// const AlipaySdkConfig = { appId, privateKey, alipayPublicKey, gateway }
// const alipaySdk = new AlipaySdk(AlipaySdkConfig);

var ali = new Alipay({
  appId: '2016091400507187',
  notifyUrl: 'http://ciniu.leanapp.cn/pay/notify',
  rsaPrivate: path.join(__dirname, './RSA/2.txt'),
  rsaPublic: path.join(__dirname, './RSA/3.txt'),
  sandbox: true,
  signType: 'RSA2'
});

router.post('/', async (req, res) => {
  try {
    var params = ali.pagePay({
      subject: '测试商品',
      body: '测试商品描述',
      outTradeId: '123abcdeFa',
      timeout: '10m',
      amount: '10.00',
      goodsType: '0',
      qrPayMode: 2
  });
  
  let url = gateway + '?' + params

  res.status(200).json({ url })
  } catch (e) {
    console.log(e)
  }

})

router.post('/notify', (req, res) => {
  console.log('in notify', req.body)
  let { out_trade_no } = req.body
})

const createTrade = () => {
  
}





module.exports = router