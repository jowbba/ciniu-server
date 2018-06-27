var fs = require('fs')
var path = require('path')
var router = require('express').Router()
var AV = require('leanengine')
var AlipaySdk = require('alipay-sdk').default
var AlipayFormData = require('alipay-sdk/lib/form').default
var { getAllRelations } = require('./lib')

const appId = '2016091300504560'
const privateKey = fs.readFileSync(path.join(__dirname, '../RSA2/2.txt'), 'ascii')
const alipayPublicKey = fs.readFileSync(path.join(__dirname, '../RSA2/publicKey.txt'), 'ascii')
const gateway = 'https://openapi.alipaydev.com/gateway.do'
const AlipaySdkConfig = { appId, privateKey, alipayPublicKey, gateway }


const alipaySdk = new AlipaySdk(AlipaySdkConfig);
console.log(alipaySdk)

router.post('/', async (req, res) => {
  try {
    let formData = new AlipayFormData()
    formData.setMethod('get');

formData.addField('notifyUrl', 'http://www.com/notify');
formData.addField('bizContent', {
  out_trade_no: 'out_trade_no',
  product_code: 'FAST_INSTANT_TRADE_PAY',
  totalAmount: '0.01',
  subject: '支付测试',
  body: '支付测试',
});


const result = alipaySdk.exec(
  'alipay.offline.material.image.upload', {}, {
    formData: formData,
  },
);

// result 为可以跳转到支付链接的 url
console.log(result);
  } catch (e) {
    console.log(e)
  }

})

router.post('/notify', (req, res) => {
  console.log('in notify')
})





module.exports = router