var router = require('express').Router()
var AV = require('leanengine')
var request = require('request')
var { createErr } = require('./lib')
var { rootVer } = require('./middleware')

router.post('/', rootVer, async (req, res) => {
  try {
    let { type, id, begin, end, skip, limit } = req.body
    let bTime = new Date(begin)
    let eTime = new Date(end)
    // check id
    if (!['1', '2'].includes(id)) 
      return res.status(400).send({ message: 'id error'})
    // check time
    if (!type || !id || !begin || !end) 
      return res.status(400).send({ message: 'params error'})
    if (bTime == 'Invalid Date' || eTime == 'Invalid Date') 
      return res.status(400).send({ message: 'Invalid Date'})
    if (bTime >= eTime) 
      return res.status(400).send({ message: 'bTime should less than eTime'})
    // check type
    if (!['register', 'consume', 'download'].includes(type))
      return res.status(400).send({ message: 'type error'})

    let result
    switch(type) {
      case 'register':
        result = await getRegisterInfo(id, bTime, eTime, skip, limit)
        break;
      case 'download':
        result = await getDownloadInfo(id, begin, end)
        break;
      default:
        console.log('in default')
    }
    res.status(200).json(result)
  } catch (e) {
    console.log(e)
    res.status(500).json({message: e.message})
  }
})

const getRegisterInfo = async (id, bTime, eTime, skip, limit) => {
  let query = new AV.Query('_User')
  query.greaterThan('createdAt', bTime)
  query.lessThan('createdAt', eTime)
  query.equalTo('sale', id)
  let count = await query.count({ useMasterKey: true })
  let splitArr = split(count, 100)
  let data = []
  for(let i = 0; i < splitArr.length; i++) {
    query.skip(splitArr[i].skip)
    query.limit(splitArr[i].limit)
    data = [...data, ...await query.find({ useMasterKey: true })]
  }
  return { count, data }
}

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
      if (err) return console.log(err)
      let result = JSON.parse(res.body).body.data
      if (!result || !result[0]) return reject(new Error('get data err'))
      // console.log(result[0].result)
      result = result[0].result
      let event = result.items[0].findIndex(item => 
        item[0]['c'] == 'download' && item[0]['a'] == 'click' && item[0]['l'] == `id=${id}`)
      if (event == -1) return reject(new Error('can not get event'))
      let count = result.items[1][event]
      resolve(count)
    })
  })

}

const getConsumeInfo = async (bTime, eTime) => {

}

const split = (count, perSize) => {
  let arr = []
  let position = 0
  while (position < count) {
    arr.push({ limit: perSize, skip: position })
    position += perSize
  }
  return arr
}

const splitDate = d => {
  let dates = d.split('-').join('')

}


module.exports = router