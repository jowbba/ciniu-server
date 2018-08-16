/*
 * @Author: harry.liu 
 * @Date: 2018-08-16 11:51:59 
 * @Last Modified by: harry.liu
 * @Last Modified time: 2018-08-16 11:54:14
 */

var router = require('express').Router()
var AV = require('leanengine')
var { rootVer, basicVer } = require('./middleware')
var { createErr, getSettingByUser, createError, createResult } = require('./lib')

router.get('/', basicVer, async (req, res) => {
  try {
    let settingObj = await getSettingByUser(req.user)
    let result = settingObj.attributes
    console.log(result)
    let { notSelected } = result
    result.types = []
    // 获取types
    let typeQuery = new AV.Query('WordsDBTypeInfo')
    let types = await typeQuery.find()
    // 处理types
    types.forEach(item => {
      let { code, name } = item.attributes
      let isSelected = notSelected.find(item => item == code)
      result.types.push({ name, code, selected: !!isSelected? false: true})
    })
    
    createResult(res, result)
  } catch (e) {
    console.log(e)
    createError(res, e)
  }
})

router.patch('/', basicVer, async (req, res) => {
  try {
    let { user } = req
    let sessionToken = user.getSessionToken()
    let { customActive, imageActive, notSelectedType, notSelectedCategory } = req.body
    if (typeof customActive !== 'boolean') throw createErr('customActive is required')
    if (typeof imageActive !== 'boolean') throw createErr('imageActive is required')

    if (!notSelectedType || !Array.isArray(notSelectedType)) throw createErr('notSelected is required')
    notSelectedType.forEach(item => {
      if (typeof item !== 'number') throw createErr('error in notSelectedType')
    })

    if (!notSelectedCategory || !Array.isArray(notSelectedCategory)) throw createErr('notSelected is required')
    notSelectedCategory.forEach(item => {
      if (typeof item !== 'number') throw createErr('error in notSelectedCategory')
    })

    let setting = await getSettingByUser(user)
    setting.set('customActive', customActive)
    setting.set('imageActive', imageActive)
    setting.set('notSelectedType', notSelectedType)
    let result = await setting.save(null, { sessionToken })
    createResult(res, result)
  } catch (e) {
    console.log('error in post setting', e.message)
    createError(res, e)
  }
})

router.get('/fix', rootVer, async (req, res) => {
  try {
    let query = new AV.Query('_User')
    let users = await query.find({ useMasterKey: true })

    for(let i = 0; i < users.length; i++) {
      let user = users[i]
      let { username } = user.attributes
      await getSettingByUser(user)
    }

    res.status(200).end()
  } catch (e) {
    console.log(e)
  }
})


module.exports = router