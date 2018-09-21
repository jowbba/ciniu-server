var AV = require('leanengine')
var E = require('./error')

module.exports = {
  basicVer: async (req, res, next) => {
    try {
      let token = req.headers['x-lc-session']
      if (!token) return res.status(403).json({ message: 'token is required'})
      let user = await AV.User.become(token)
      if (!user) return res.status(403).json({ message: 'forbidden'})
      req.user = user
      req.sessionToken = req.headers['x-lc-session']
      next()
    } catch (e) { 
      res.status(403).json(e) }

  },

  rootVer: async (req, res, next) => {
    try {
      let token = req.headers['x-lc-session']
      if (!token) return res.status(403).json({ message: 'token is required'})
      let user = await AV.User.become(token)
      let roles = await user.getRoles()
      let managerRole = roles.find(item => item.attributes.name === 'Manager')
      if (!managerRole) return res.status(403).json({ message: 'forbidden'})
      req.user = user
      req.sessionToken = req.headers['x-lc-session']
      next()
    } catch (e) { res.status(403).json(e) }
  },

  wordQuery: async (req, res, next) => {
    try {
      let { user } = req
      let { createdAt } = user
      let { probationDay, license } = user.attributes
      let begin = (new Date(createdAt)).getTime()
      let now = (new Date()).getTime()
      let gap = (now - begin) / 1000 / 60 / 60 / 24

      // 判断是否购买
      if (license) {
        console.log('已购买')
        return next()
      } else console.log('未购买')

      // 判断是否在试用期内
      if (gap < probationDay) {
        console.log('在试用期')
        return next()
      } else console.log('不在试用期')
      
      res.error(new E.LisenceForbid())
    } catch (e) { res.error(e) }
  },

  imageQuery: async (req, res, next) => {
    try {
      let { user } = req
      let { createdAt } = user
      let { probationDay, probationImage, freeImage, license, balance } = user.attributes
      let begin = (new Date(createdAt)).getTime()
      let now = (new Date()).getTime()
      let gap = (now - begin) / 1000 / 60 / 60 / 24

      // 判断是否购买
      if (license) {
        console.log('已购买')
        req.license = license
        // 判断免费图片次数
        if (freeImage > 0 ) return next()
        // 判断余额是否充足
        if (balance >= Number(process.env.imageConsume)) return next()
        throw new E.InsufficientBalance()
      }

      // 判断是否在试用期内
      if (gap < probationDay) {
        req.inProbation = true
        console.log('在试用期')
        if (probationImage > 0) return next()
        throw new E.InsufficientProbationImg()
      } else console.log('不在试用期')

      throw new E.LisenceForbid()
    } catch (e) { res.error(e) }
  }
}