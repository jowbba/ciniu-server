var router = require('express').Router()
var AV = require('leanengine')
var { createErr } = require('./lib')

router.post('/', async (req, res) => {
  try {
    // 查询用户角色
    let user = await AV.User.become(req.headers['x-lc-session'])
    let { count } = req.body
    if (!user) throw createErr('user not exist', 403)
    if (!count) throw createErr('count is required', 400)
    if (typeof count !== 'number') throw createErr('count should be number', 400)
    let { points, consumedPoints, toAccountWords, accountedWords } = user.attributes
    let newCountToAccont = count + toAccountWords
    // 增加点数后 取整 取余
    let integer = Math.floor(newCountToAccont / 500)
    let remainder = newCountToAccont % 500
    // 整数未到500 增加待结算字数 返回
    if (integer == 0) {
      user.increment('toAccountWords', count) 
      await user.save({}, token(req))
    }

    console.log(user)

    
    res.status(200).json({})
  } catch (e) {
    console.log(e)
    res.status(e.code && e.code > 200? e.code: 500).json({ message: e.message })
  }
})

const token = req => {
  return { sessionToken: req.headers['x-lc-session'] }
}

module.exports = router