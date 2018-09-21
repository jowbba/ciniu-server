var router = require('express').Router()
var AV = require('leanengine')
var { basicVer } = require('./middleware')
var { getUserWithRoot } = require('./lib')
var E = require('./error')

// 注册验证码
router.post('/code', async (req, res) => {
  try {
    let { username } = req.body
    if (!username) throw new E.UsernameRequired()
    let existUser = await getUserWithRoot(username)
    if (existUser.length > 0) throw new E.UserAlreadyExist()
    await AV.Cloud.requestSmsCode(username)
    res.status(200).json({ message: 'ok', result: '', state: true, code: 200 })
  } catch (e) {
    console.error(e.message, 'in code')
    res.error(e)
  }
})

// 注册用户
router.post('/', async (req, res) => {
  try {
    let probationDay = Number(process.env.probationDay) || 0
    let probationImage = Number(process.env.probationImage) || 0
    let { username, password, code, sale } = req.body
    if (!username) throw new E.UsernameRequired()
    if (!password) throw new E.PasswordRequired()
    if (!code) throw new E.SmsCodeRequired()

    let existUser = await getUserWithRoot(username)
    if (existUser.length > 0) throw new E.UserAlreadyExist()

    let defaultProperty = {
      password,
      probationDay,
      probationImage,
      freeImage: 0,
      balance: 0,
      sale: sale ? sale : '-1',
      points: 0
    }
    // 注册
    let newUser = await AV.User.signUpOrlogInWithMobilePhone(username, code, defaultProperty)
    // 获取
    let sessionToken = newUser.getSessionToken()

    let result = Object.assign({}, JSON.parse(JSON.stringify(newUser)), { sessionToken })
    res.success(result)
  } catch (e) {
    console.error(e.message, 'in register')
    res.error(e)
  }
})

// 修改密码验证码
router.post('/pwdcode', async (req, res) => {
  try {
    let { username } = req.body
    if (!username) throw new E.UsernameRequired()
    let existUser = await getUserWithRoot(username)
    if (existUser.length == 0) throw new E.UserNotExist()
    await AV.User.requestPasswordResetBySmsCode(username)
    // res.status(200).json({ message: 'ok', state: true, code: 200, result: '' })
    res.success('')
  } catch (e) {
    console.log(e.message, 'in pwdcode')
    res.error(e)
  }
})

// 修改密码
router.post('/password', async (req, res) => {
  try {
    let { username, password, code } = req.body
    if (!username) throw new E.UsernameRequired()
    if (!password) throw new E.PasswordRequired()
    if (!code) throw new E.SmsCodeRequired()

    await AV.User.resetPasswordBySmsCode(code, password)
    let user = await AV.User.logIn(username, password)

    let sessionToken = user.getSessionToken()
    let result = Object.assign({}, JSON.parse(JSON.stringify(user)), { sessionToken })

    res.success(result)
  } catch (e) {
    console.error(e.message, 'in password')
    res.error(e)
  }
})

// 查询用户信息
router.get('/', basicVer, async (req, res) => {
  try {
    let user = await AV.User.become(req.sessionToken)
    res.success(user)

  } catch (e) {
    console.error(e.message, 'in get user')
    res.error(e)
  }
})

const J = obj => JSON.parse(JSON.stringify(obj))

module.exports = router