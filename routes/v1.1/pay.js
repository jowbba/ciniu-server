var path = require('path')
var router = require('express').Router()
var AV = require('leanengine')
var { createErr, getUserWithRoot, getTradeWithId, setBalance, setLicense } = require('./lib')
var { basicVer } = require('./middleware')

const Alipay = require('alipay-node-sdk');


const gateway = 'https://openapi.alipay.com/gateway.do'

var ali = new Alipay({
  appId: '2018062760432332',
  notifyUrl: 'http://ciniu.leanapp.cn/pay/notify',
  rsaPrivate: path.join(__dirname, '../RSA/private_key.txt'),
  rsaPublic: path.join(__dirname, '../RSA/alipay_public_key.txt'),
  sandbox: false,
  signType: 'RSA2'
});

/** 
  * 创建用户订单API
  @param {Number} annualCount - 会员期限
  @param {Number} pointIndex - 购买点数类型ID
  @param {String} invoiceClassify - 发票材质
  @param {String} invoiceType - 发票类型
  @param {String} invoiceTitle - 发票抬头
  @param {String} invoiceId - 发票纳税人识别号
  @param {String} address - 发票地址
  @param {String} email - 收件地址
  @param {String} name - 收件人姓名
  @param {String} phone - 收件人手机号
  @param {String} code -收件人邮编
  @param {String} pay -支付方式
*/
// 创建订单
router.post('/', basicVer, async (req, res) => {
  try {
    let { user } = req
    let { username, license } = user.attributes
    let { purchase, amount, invoiceClassify, invoiceType, invoiceTitle,
      invoiceId, address, email, name, phone, code, pay } = req.body
    // 检查参数
    // 购买为空
    if (amount == 0 && !purchase) throw createErr('pay content is empty')
    // 软件重复购买
    if (license && purchase) throw createErr('user has license already')
    // 软件、余额同时购买
    if (purchase && amount !== 0) throw createErr('license should bug first')
    // 没有软件权限，购买余额
    if (!license && !purchase) throw createErr('license is required')
    

    let { price, describe } = createTrade(purchase, amount)

    // 创建订单信息
    let acl = new AV.ACL()
    acl.setReadAccess(user, true)
    acl.setRoleReadAccess('Manager', true)
    acl.setRoleWriteAccess('Manager', true)

    let Trade = AV.Object.extend('Trade')
    let trade = new Trade()
    trade.setACL(acl)

    let result = await trade.save({ username, price, license: purchase, amount, describe, status: '', invoiceClassify, invoiceType, invoiceTitle, invoiceId, address, email, name, phone, code, pay }, { useMasterKey: true })
    if (user.attributes.username == '13621766832') price = 0.1

    var params = ali.pagePay({
      subject: '词牛充值',
      body: describe,
      outTradeId: result.id, //as out_trade_no
      timeout: '10m',
      amount: price,
      goodsType: '0',
      qrPayMode: 2,
      return_url: 'http://www.ciniuwang.com/paid'
    });

    let url = gateway + '?' + params

    res.status(200).json({ url, result })

  } catch (e) {
    console.error(e, 'err in post trade')
    res.status(e.code && e.code > 200 ? e.code : 500).json({ message: e.message })
  }
})

// 接收到支付宝通知
router.post('/notify', async (req, res) => {
  try {
    let { out_trade_no } = req.body
    console.log(`in notify: ${out_trade_no}`)
    let trade = await queryTrade(out_trade_no)
    await dealWithTrade(trade)

    res.status(200).json({ message: 'ok' })
    // 更新交易信息
  } catch (e) {
    res.status(e.code && e.code > 200 ? e.code : 500).json({ message: e.message })
  }
})

// 查询订单信息
router.get('/trade', basicVer, async (req, res) => {
  try {
    let { sessionToken, user } = req
    let { id } = req.query
    if (!id) throw createErr('id is required', 400)
    // 查询当前用户订单是否存在
    let tradeResult = await getTradeWithId(id)
    if (tradeResult.length !== 1) throw createErr('trade is not exist')
    // 查询支付宝订单信息
    let trade = await queryTrade(id)
    // 处理订单
    await dealWithTrade(trade)
    res.status(200).json(trade)
  } catch (e) {
    console.log(e)
    res.status(e.code && e.code > 200 ? e.code : 500).json({ message: e.message })
  }
})

// 订单详情
const createTrade = (purchase, amount) => {
  let price = 0
  let describe = ''

  if (purchase) {
    price += Number(process.env.license)
    describe += `软件费用:${price} `
  } else if (amount > 0) {
    price += amount
    describe += `充值金额:${amount}`
  }

  return { price, describe }
}

// 查询支付宝订单
const queryTrade = async id => {
  let queryResult = await ali.query({ outTradeId: id })
  let ok = ali.signVerify(queryResult.json())
  if (!ok) throw createErr('bad request !@#$%^&*', 403)
  let trade = queryResult.json().alipay_trade_query_response
  return trade
}

// 处理订单
const dealWithTrade = async trade => {
  let { out_trade_no } = trade
  // 检查订单
  if (trade.code == '10000' && trade.trade_status == 'TRADE_SUCCESS') {
    // 获取本地交易记录
    let tradeObj = (await getTradeWithId(out_trade_no))[0]
    console.log(`in deal with trade: ${out_trade_no}, status is : ${tradeObj.attributes.status}`)
    if (tradeObj.attributes.status == 'busy' || tradeObj.attributes.status == 'TRADE_SUCCESS') return
    // 设置订单状态 ==> busy
    console.log(`set trade status busy : ${out_trade_no}`)
    await tradeObj.save({ status: 'busy' }, { useMasterKey: true })

    // 处理用户信息
    let { username, license, amount } = tradeObj.attributes
    let user = await getUserWithRoot(username)
    if (license) await setLicense(user)
    if (amount > 0) await setBalance(user, amount)

    // 更新订单
    console.log(`finish trade : ${out_trade_no}`)
    tradeObj.set('status', 'TRADE_SUCCESS')
    await tradeObj.save({}, { useMasterKey: true })

  } else {

  }

}





module.exports = router