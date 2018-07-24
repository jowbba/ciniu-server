var router = require('express').Router()
var AV = require('leanengine')
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
      default:
      console.log('in default')
    }
    res.status(200).json(result)
  } catch (e) {
    console.log(e.message)
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


module.exports = router