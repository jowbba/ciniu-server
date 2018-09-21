/*
 * @Author: harry.liu 
 * @Date: 2018-08-16 11:51:59 
 * @Last Modified by: harry.liu
 * @Last Modified time: 2018-08-22 17:35:21
 */

var router = require('express').Router()
var AV = require('leanengine')
var { rootVer, basicVer } = require('./middleware')
var { createErr, getSettingByUser, createError, createResult, getTypeWithId } = require('./lib')

router.get('/', basicVer, async (req, res) => {
  try {
    let settingObj = await getSettingByUser(req.user)
    let result = settingObj.attributes
    let { notSelectedType } = result
    result.types = []
    // 获取types
    let typeQuery = new AV.Query('WordsType')
    let types = await typeQuery.find()
    // 处理types
    types.forEach(item => {
      let { typeId, typeName } = item.attributes
      let isSelected = notSelectedType.find(item => item == typeId)
      result.types.push({ typeName, typeId, selected: !!isSelected? false: true})
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
    let { customActive, imageActive, notSelectedType } = req.body
    if (typeof customActive !== 'boolean') throw createErr('customActive is required')
    if (typeof imageActive !== 'boolean') throw createErr('imageActive is required')

    // 检查types
    if (!notSelectedType || !Array.isArray(notSelectedType)) throw createErr('notSelected is required')
    for(let i = 0; i < notSelectedType.length; i++) {
      let typeId = notSelectedType[i]
      let type = await getTypeWithId(typeId)
      if (!type) return res.error(`type id : ${typeId} not exist`)
    }

    // 更新setting
    let setting = await getSettingByUser(user)
    setting.set('customActive', customActive)
    setting.set('imageActive', imageActive)
    setting.set('notSelectedType', notSelectedType)
    let result = await setting.save(null, { sessionToken })

    res.success(result)
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