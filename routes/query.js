var router = require('express').Router()
var AV = require('leanengine')
var request = require('request')
var { createErr } = require('./lib')
var { rootVer } = require('./middleware')

router.post('/', rootVer, async (req, res) => {
  try {
    let { type, id, begin, end, skip, limit } = req.body
    let bTime = new Date(Date.parse(begin) - 8 * 3600 * 1000)
    let eTime = new Date(Date.parse(end) - 8 * 3600 * 1000)
    // check id
    if (!['-1','cnsa1', 'cnsa2', 'cnsa3'].includes(id)) 
      return res.status(400).send({ message: 'id error'})
    // check time
    if (!type || !id || !begin || !end) 
      return res.status(400).send({ message: 'params error'})
    if (bTime == 'Invalid Date' || eTime == 'Invalid Date') 
      return res.status(400).send({ message: 'Invalid Date'})
    if (bTime >= eTime) 
      return res.status(400).send({ message: 'bTime should less than eTime'})
    // check type
    if (!['register', 'consume', 'download', 'point'].includes(type))
      return res.status(400).send({ message: 'type error'})

    let result
    switch(type) {
      case 'register':
        result = await getRegisterInfo(id, bTime, eTime)
        break
      case 'download':
        result = await getDownloadInfo(id, begin, end)
        let now = new Date()
        let year = now.getFullYear()
        let month = now.getMonth() + 1
        if (month < 10) month = '0' + month
        let date = now.getDate()
        if (date < 10) date = '0' +  date
        let b = `${year}-${month}-${date}`
        let total = await getDownloadInfo(id, '2018-07-01', b)
        Object.assign(result, {total: total.data})
        break
      case 'consume':
        result = await getConsumeInfo(id, bTime, eTime)
        break
      case 'point':
        result = await getPointsInfo(id, bTime, eTime)
        break
      default:
        console.log('in default')
    }
    res.status(200).json(result)
  } catch (e) {
    console.log(e)
    res.status(500).json({message: e.message})
  }
})

// 注册统计
const getRegisterInfo = async (id, bTime, eTime) => {
  let query = new AV.Query('_User')
  query.equalTo('sale', id) 
  let total = await query.count({ useMasterKey: true })
  if (bTime) query.greaterThan('createdAt', bTime)
  if (eTime) query.lessThan('createdAt', eTime)
  
  let count = await query.count({ useMasterKey: true })
  let splitArr = split(count, 100)
  let data = []
  for(let i = 0; i < splitArr.length; i++) {
    query.skip(splitArr[i].skip)
    query.limit(splitArr[i].limit)
    data = [...data, ...await query.find({ useMasterKey: true })]
  }
  return { count, data, total }
}

// 下载统计
const getDownloadInfo =  (id, begin, end) => {
  let options = {
    url: 'https://api.baidu.com/json/tongji/v1/ReportService/getData',
    method: 'POST',
    headers: 'application/json',
    body: JSON.stringify({
      header: {
        account_type: 1,
        password: "jowaab11",
        token: "d25bcef17ffc3cdd10169bec1413d2ac",
        username: "jowbba"
      },
      body: {
        siteId: "12276044",
        method: "custom/event_track/a",
        start_date: begin.split('-').join(''),
        end_date: end.split('-').join(''),
        metrics: "event_count, uniq_event_count"
      }
    })
  }

  return new Promise((resolve, reject) => {
    request(options, (err, res) => {
      if (err) return reject(err)
      let result = JSON.parse(res.body).body.data
      if (!result || !result[0]) return reject(new Error('get data err'))
      result = result[0].result

      let condition
      if (id == '-1') {
        condition = item => {
          return item[0]['c'] == 'download' && item[0]['a'] == 'click' && item[0]['l'] == `-`
        }
      } else {
        condition = item => {
          return item[0]['c'] == 'download' && item[0]['a'] == 'click' && item[0]['l'] == `id=${id}`
        }
        
      }

      let event = result.items[0].findIndex(condition)
      if (event == -1) return reject(new Error('can not get event'))
      let count = result.items[1][event]
      resolve({data: count})
    })
  })
}

// 消费统计
const getConsumeInfo = async (id, bTime, eTime) => {
  let { data } = await getRegisterInfo(id)
  let consumeUserCount = 0
  let currentConsumeUserCount = 0
  let records = []
  for(let i = 0; i < data.length; i++) {
    let first = 0, second = 0, current = 0, include = false
    // 查询当前用户消费记录
    let username = data[i].attributes.username
    let trades = await getConsumeByUsername(username)
    // 计算是否是付费用户
    if (trades.length == 0) continue
    else consumeUserCount += 1
    
    for(let j = 0; j < trades.length; j++) {
      // 首冲金额
      if (j == 0) first = trades[j].attributes.price
      // 二次充值金额
      else if (j == 1) second = trades[j].attributes.price
      // 计算日期范围内充值金额
      else {
        let currentRecords = await getConsumeByUsername(username, bTime, eTime)
        currentRecords.forEach((item, index) => {
          if (item.id == trades[0].id || item.id == trades[1].id) return
          current += item.attributes.price
          if (!include) {
            currentConsumeUserCount += 1
            include = true
          }
        })
        break
      }
    }

    records.push({ username, first, second, current })
  }

  return { consumeUserCount, currentConsumeUserCount, records}
}

const getPointsInfo = async (id, bTime, eTime) => {
  let { data } = await getRegisterInfo(id)
  let activeUserCount = 0
  let detail = []
  let totalWord = 0
  let totalImage = 0

  for(let i = 0; i < data.length; i++) {
    
    let word = 0, image = 0
    let username = data[i].attributes.username
    let record = await getRecordByUsername(username, bTime, eTime)
    if (record.length == 0) continue
    activeUserCount += 1
    record.forEach(item => {
      if (item.attributes.type == 'word') {
        word +=1
        totalWord += 1
      }
      else if (item.attributes.type == 'image') {
        image += 1
        totalImage += 1
      }
    })
    
    detail.push({ username, word, image})
  }

  return { activeUserCount, totalImage, totalWord, detail }
}

// 分页获取全部数据
const split = (count, perSize) => {
  let arr = []
  let position = 0
  while (position < count) {
    arr.push({ limit: perSize, skip: position })
    position += perSize
  }
  return arr
}

const getConsumeByUsername = async (username, bTime, eTime) => {
  let tradeQuery = new AV.Query('Trade')
  tradeQuery.equalTo('username', username)
  tradeQuery.equalTo('status', 'TRADE_SUCCESS')
  tradeQuery.ascending('createdAt')
  if (bTime) tradeQuery.greaterThan('createdAt', bTime)
  if (eTime) tradeQuery.lessThan('createdAt', eTime)
  let trades = await tradeQuery.find({ useMasterKey: true })
  return trades
}

const getRecordByUsername = async (username, bTime, eTime) => {
  let recordQuery = new AV.Query('PointConsume')
  recordQuery.equalTo('username', username)
  recordQuery.ascending('createdAt')
  if (bTime) recordQuery.greaterThan('createdAt', bTime)
  if (eTime) recordQuery.lessThan('createdAt', eTime)
  let trades = await recordQuery.find({ useMasterKey: true })
  return trades
}


module.exports = router