var AV = require('leanengine')

module.exports = {
  basicVer: async (req, res, next) => {

  },

  rootVer: async (req, res, next) => {
    try {
      let user = await AV.User.become(req.headers['x-lc-session'])
      let roles = await user.getRoles()
    } catch (e) {

    }

  }
}