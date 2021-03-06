var router = require('express').Router()
var AV = require('leanengine')
var { createErr } = require('./lib')
var { basicVer } = require('./middleware')


router.post('/', basicVer, async (req, res) => {
  try {
    // 查询用户角色
    let { user, sessionToken, fileName } = req
    let { count } = req.body
    if (!user) throw createErr('user not exist', 403)
    if (!count) throw createErr('count is required', 400)
    if (typeof count !== 'number' || count < 0) throw createErr('count should be number', 400)
    let { username } = user.attributes
    let describe = ''

    // 添加用户待扣字数
    describe += `查询字数${count} `
    user = await addToAccountWords(user, count, sessionToken)

    // 是否需要扣点
    let n = parseInt(user.attributes.toAccountWords / 500)
    let pointsToConsume = n * 4
    // let actualPoints = pointsToConsume
    let actualPoints = 0
    describe += `${n > 0?'达到500':'不到500字'}　扣点${pointsToConsume} `
    
    // 更新用户对象
    user.increment('accountedWords', count)
    user.increment('consumedPoints', actualPoints)
    user.increment('toAccountWords', -500 * n)
    user.increment('points', -actualPoints)
    user = await user.save({}, {
      // query: new AV.Query(AV.User).greaterThanOrEqualTo('points', 0),
      fetchWhenSave: true,
      sessionToken
    })

    // 记录
    let Record = AV.Object.extend('PointConsume')
    let record = new Record()
    let { toAccountWords } = user.attributes
    let type = 'word'
    describe += `新代扣点为${toAccountWords}`



    await record.save(
      { type, username, count, pointsToConsume, actualPoints, toAccountWords, describe, fileName }, 
      { sessionToken })
  
    res.status(200).json(user)
    
  } catch (e) {
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
})

// 添加用户待扣字数
const addToAccountWords = async (user, count, sessionToken) => {
  user.increment('toAccountWords', count)
  return await user.save({}, { sessionToken, fetchWhenSave: true,})
}




module.exports = router