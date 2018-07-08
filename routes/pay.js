var fs = require('fs')
var path = require('path')
var router = require('express').Router()
var AV = require('leanengine')
var AlipaySdk = require('alipay-sdk').default
var AlipayFormData = require('alipay-sdk/lib/form').default
var { getAllRelations, createErr, setPoints, setRoles, getUserWithRoot } = require('./lib')

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

// 创建订单1
router.post('/', async (req, res) => {
  try {
    let user = await AV.User.become(req.headers['x-lc-session'])
    let { username } = user.attributes
    let { types, pointIndex } = req.body
    if (!types) types = []
    if (!user) throw createErr('user is not login', 403)
    if (!types || !Array.isArray(types)) throw createErr('types is required', 400)
    if (types.length == 0 && pointIndex == -1) throw createErr('pay content is empty')
    if (!pointIndex ) throw createErr('pointIndex is required')
    
    let { price, points, roles, describe, time } = createTrade(types, pointIndex)
    // 创建订单信息
    let acl = new AV.ACL()
    acl.setReadAccess(user, true)
    acl.setRoleReadAccess('Manager', true)
    acl.setRoleWriteAccess('Manager', true)
    let Trade = AV.Object.extend('Trade')
    let trade = new Trade()
    trade.setACL(acl)

    let result = await trade.save({username, price, points, roles, describe, status: '', time}, {useMasterKey: true})

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
    console.log(e)
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
})

router.post('/2', async (req, res) => {
  try {
    let user = await AV.User.become(req.headers['x-lc-session'])
    let { username } = user.attributes
    let { annualCount, pointIndex, invoiceClassify, invoiceType, invoiceTitle, invoiceId, address, email, name, photo, code, pay } = req.body

    // 检查参数
    if (!user) throw createErr('user is not login', 403)
    if (annualCount == 0 && pointIndex == -1) throw createErr('pay content is empty')
    if (!pointIndex ) throw createErr('pointIndex is required')
    
    let { price, points, roles, describe, time } = createTrade(types, pointIndex)
    // 创建订单信息
    let acl = new AV.ACL()
    acl.setReadAccess(user, true)
    acl.setRoleReadAccess('Manager', true)
    acl.setRoleWriteAccess('Manager', true)
    let Trade = AV.Object.extend('Trade')
    let trade = new Trade()
    trade.setACL(acl)

    let result = await trade.save({username, price, points, roles, describe, status: '', time}, {useMasterKey: true})

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
    console.log(e)
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
})

// 接收到支付宝通知
router.post('/notify', async (req, res) => {
  try {
    console.log('in notify')
    let { out_trade_no } = req.body
    console.log(out_trade_no)
    let queryResult = await ali.query({outTradeId:out_trade_no})
    let ok = ali.signVerify(queryResult.json())
    if (!ok) return res.status(200).json({message: 'bad request !@#$%^&*'})
    else return res.status(200).json({message: 'bad request !@#$%^&*'})
    let trade = queryResult.json().alipay_trade_query_response
    if (trade.trade_status == 'TRADE_SUCCESS') {
      // 
      let result = await finishTrade(trade)
    } else {
      return res.status(200).json({message: 'bad request !@#$%^&*'})
    }

    console.log(queryResult.json())

  // 更新交易信息
  } catch (e) {
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
})

router.get('/trade', async (req, res) => {
  try {
    let user = await AV.User.become(req.headers['x-lc-session'])
    let { username } = user.attributes
    let { id } = req.query
    if (!id) throw createErr('id is required', 400)
    // 查询当前用户订单是否存在
    let tradeQuery = new AV.Query('Trade')
    tradeQuery.equalTo('objectId', id)
    let tradeQueryResult = await tradeQuery.find(token(req))
    if (tradeQueryResult.length == 0) throw createErr('trade is not exist')
    if (tradeQueryResult[0].attributes.status == 'TRADE_SUCCESS')
      return res.status(200).json(trade)
    // 查询支付宝订单信息
    let trade = await queryTrade(id)
    // 处理订单
    await dealWithTrade(trade)
    res.status(200).json(trade)
  } catch (e) {
    console.log(e)
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  } 
})


const createTrade = (types, pointIndex) => {
  let price = 0
  let points = 0
  let roles = []
  let describe = ''
  //计算会员
  types.forEach(type => {
    let obj = typeList.find(item => item.roleName == type)
    if (obj) price += obj.price
    roles.push(obj.roleName)
    describe += '充值会员' + obj.roleName + ' '
  })

  // 计算点数
  if (pointIndex !== -1 && pointList[pointIndex]) {
    points = pointList[pointIndex].count
    price += pointList[pointIndex].price
    describe += '充值点数' + points
  }

  return { price, points, roles, describe, time: 365}
}

const pointList = [
  {price: 50, count: 5000},
  {price: 98, count: 10000},
  {price: 180, count: 20000},
  {price: 350, count: 40000},
  {price: 1000, count: 120000}
]

const typeList = [
  { name: '词牛违禁词软件', roleName: 'Vip', price: 1000, days: 365}
]

const token = req => {
  return { sessionToken: req.headers['x-lc-session'] }
}

// 查询订单
const queryTrade = async id => {
  let queryResult = await ali.query({outTradeId:id})
  let ok = ali.signVerify(queryResult.json())
  // console.log(queryResult.json())
  if (!ok) throw createErr('bad request !@#$%^&*', 403)
  let trade = queryResult.json().alipay_trade_query_response
  return trade
}

// 处理订单
const dealWithTrade = async trade => {
  let { out_trade_no } = trade
  // 完成订单
  if (trade.code == '10000' && trade.trade_status == 'TRADE_SUCCESS') {
    
    let tradeQuery = new AV.Query('Trade')
    tradeQuery.equalTo('objectId', out_trade_no)
    let tradeQueryResult = await tradeQuery.find({useMasterKey: true})
    let tradeObj = tradeQueryResult[0]
    let { username, points, roles, describe, time } = tradeObj.attributes
    let user = await getUserWithRoot(username)
    // 添加点数
    await setPoints(user, points)
    // 添加会员
    await setRoles(user, roles, time, describe)
    // 更新订单
    tradeObj.set('status', 'TRADE_SUCCESS')
    await tradeObj.save({}, {useMasterKey: true})
    
  } else {

  }
  
  let tradeObj =  AV.Object.createWithoutData('Trade', out_trade_no)
  tradeObj
}





module.exports = router