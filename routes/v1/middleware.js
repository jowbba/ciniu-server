var AV = require('leanengine')

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

  }
}