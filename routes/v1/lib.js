var AV = require('leanengine')

const useMasterKey = true

module.exports = {
  split: (count, perSize) => {
    let arr = []
    let position = 0
    while (position < count) {
      arr.push({ limit: perSize, skip: position })
      position += perSize
    }
    return arr
  },

  createErr: (message, code) => {
    return Object.assign(new Error(message), { code })
  },

  createResult: (res, data) => {
    let result = JSON.stringify(data)
    res.status(200).json({ code: 200, message: '', result, state: true})
  },

  createError: (res, err) => {
    let message = !!err.rawMessage? err.rawMessage: err.message
    res.status(200).json({ code: 200, message, result: '', state: false})
  },

  token: req => {
    return { sessionToken: req.headers['x-lc-session'] }
  },

  resErr: (res, error) => {
    let code = error.code > 200? error.code: 500
    let message = error.message
    console.log(code, error)
    res.status(code).json({ message })
  },

  getWords: (word) => {
    try {
      let words = []

      for (let i in word) {
        for(let j = i; j < word.length; j++) {
          if ( j - i > 8) continue
          words.push({ 
            name: word.slice(i, Number(j) + 1),
            begin: Number(i) + 1,
            length: Number(j) - Number(i) + 1
          })
        }
      }

      let map = new Map()
      words.forEach(word => map.set(word.name, word))
      return [...map.values()]
    } catch (e) {
      throw(e)
    }
  },

  // 通过用户名获取用户对象(root)
  getUserWithRoot: async (username) => {
    let userQuery = new AV.Query('_User')
    userQuery.equalTo('username', username)
    return await userQuery.find({ useMasterKey: true })
  },

  // 获取vip对应role对象(root)
  getVipRoles: async () => {
    let vipRoleQuery = new AV.Query(AV.Role)
    vipRoleQuery.equalTo('name', 'Vip')
    let result = await vipRoleQuery.find({ useMasterKey: true })
    if (result.length !== 1) throw new Error('role of vip is not exist')
    return result
  },

  // 查询type对应role(root)
  getRoles: async (types) => {
    let typesResult = []

    for (let i = 0; i < types.length; i++) {
      let typeQuery = new AV.Query('WordsDBTypeInfo')
      typeQuery.equalTo('code', types[i])
      typeQuery.include('role')
      let typeResult = await typeQuery.find({ useMasterKey: true })
      if (typeResult.length !== 0 && typeResult[0].attributes.role) typesResult.push(...typeResult)
      else throw new Error(` type code ${types[i]} is not exist`)
    }

    typesResult = typesResult

    return typesResult.map(type => type.attributes.role)
  },

  // 查询所有用户可见的词关系
  getAllRelations: async (req, res) => {
    let relationQuery = new AV.Query('WordsRelationInfo')
    let relationCount = await relationQuery.count(token(req))
    if (relationCount == 0) throw new Error('can not found any word belong to user')
    let splitArr = split(relationCount, 100)
    let queryArr = splitArr.map(item => {
      relationQuery.limit(item.limit)
      relationQuery.skip(item.skip)
      relationQuery.include('wordsDBType.role')
      relationQuery.include('contrabandWords')
      relationQuery.include('wordsCategory')
      relationQuery.descending('createdAt')
      return relationQuery.find(token(req))
    })

    // ---------------------------------------------------

    // let relations = await Promise.all(queryArr)

    // ---------------------------------------------------
    let relations = []

    for(let i = 0; i < queryArr.length; i++) {
      let result = await queryArr[i]
      relations.push(result)
    }

    // ---------------------------------------------------

    relations = relations.reduce((total, current) => {
      return [...total, ...current]
    }, [])
    relations = JSON.parse(JSON.stringify(relations))

    return relations
  },

  // 以超级权限给用户添加点数
  setPoints: async (user, points) => {
    // 检查point
    if (typeof points !== 'number' || points <= 0) throw new Error('points should be number and grater than 0')
    // 检查user
    if (!user.length) throw new Error('user not exits')
    // 增加点数
    user[0].increment('points', points)
    await user[0].save({}, { useMasterKey: true })
  },

  // 以超级用户给用户添加会员
  setRoles: async (user, rolesName, time, describe) => {
    //获取roles对象
    let roles = []
    
    for (let i = 0; i < rolesName.length; i++) {
      let roleQuery = new AV.Query(AV.Role)
      roleQuery.equalTo('name', rolesName[i])
      
      let roleRsult = await roleQuery.find({ useMasterKey: true })
      
      if (roleRsult.length !== 0 ) roles.push(roleRsult[0])
      else throw new Error(` role name ${rolesName[i]} is not exist`)
    }

    // 为用户赋予角色
    for(let i = 0; i < roles.length; i++) {
      console.log(roles[i].attributes)
      // 创建角色记录
      let { oldRoleRecord, newRoleRecord } = await createRoleRecord(
        user[0].attributes.username, roles[i].attributes.name, 
        roles[i].attributes.typeName, time, describe)

      // 查询用户是否已拥有角色
      let roleQuery = new AV.Query(AV.Role)
      roleQuery.equalTo('name', roles[i].attributes.name)
      roleQuery.equalTo('users', user[0])
      let roleResult = await roleQuery.find({useMasterKey: true})

      if (roleResult.length > 0) {
        // 用户具备当前角色
        console.log('用户具备当前角色')
      } else {
        // 用户不具备当前角色
        console.log('用户不具备当前角色')
        let relation = roles[i].getUsers()
        relation.add(user[0])
        await roles[i].save({}, {useMasterKey: true})
      }

      if (oldRoleRecord) {
        oldRoleRecord.set('active', false)
        await oldRoleRecord.save(null,{useMasterKey: true})
      }

      newRoleRecord.set('active', true)
      await newRoleRecord.save(null,{useMasterKey: true})
    }
  },

  setRoles2: async (user, annualCount, describe) => {
    if (annualCount == 0) return
    let role
    //获取role对象
      let roleQuery = new AV.Query(AV.Role)
      roleQuery.equalTo('name', 'Vip')
      let roleRsult = await roleQuery.find({ useMasterKey: true })
      
      if (roleRsult.length !== 0 ) role = (roleRsult[0])
      else throw new Error(` role name ${rolesName[i]} is not exist`)
    

    // 为用户赋予角色
      // 创建角色记录
      let { oldRoleRecord, newRoleRecord } = await createRoleRecord(
        user[0].attributes.username, role.attributes.name, 
        role.attributes.typeName, annualCount * 365, describe)

      // 查询用户是否已拥有角色
      let roleQuery2 = new AV.Query(AV.Role)
      roleQuery2.equalTo('name', role.attributes.name)
      roleQuery2.equalTo('users', user[0])
      let roleResult = await roleQuery2.find({useMasterKey: true})

      if (roleResult.length > 0) {
        // 用户具备当前角色
        console.log('用户具备当前角色')
      } else {
        // 用户不具备当前角色
        console.log('用户不具备当前角色')
        let relation = role.getUsers()
        relation.add(user[0])
        await role.save({}, {useMasterKey: true})
      }

      if (oldRoleRecord) {
        oldRoleRecord.set('active', false)
        await oldRoleRecord.save(null,{useMasterKey: true})
      }

      newRoleRecord.set('active', true)
      await newRoleRecord.save(null,{useMasterKey: true})
  },

  // 查找用户设置信息 不存在则创建
  getSettingByUser: async user => {
    try {
      let { username } = user.attributes
      // 查询设置
      let query = new AV.Query('Setting')
      query.equalTo('username', username)
      let result = await query.first({useMasterKey: true})
      // 结果不存在则创建
      if (!result) {
        let sessionToken = user.getSessionToken()
        let Setting = AV.Object.extend('Setting')
        let setting = new Setting()
        setting.set('imageActive', true)
        setting.set('customActive', true)
        setting.set('notSelectedType', ['T13'])
        setting.set('username', username)
        result = await setting.save({}, { sessionToken, fetchWhenSave: true })
      }

      return result
    } catch (e) { 
      console.log(e)
      throw e
    }
  },

  // 查询所有新类目 类目会小于100条 不进行分页查询
  getTypes: async () => {
    let typeQuery = new AV.Query('WordsType')
    return typeQuery.find({ useMasterKey })
  },

  // 根据typeId查询类目(root)
  getTypeWithId: async (typeId) => {
    let typeQuery = new AV.Query('WordsType')
    typeQuery.equalTo('typeId', typeId)
    return typeQuery.first({ useMasterKey })
  },

  // 根据clauseId查询条款(root)
  getClauseWithId: async (clauseId) => {
    let clauseQuery = new AV.Query('WordsLawClause')
    clauseQuery.equalTo('clauseId', clauseId)
    return clauseQuery.first({ useMasterKey })
  },

  // 根据type 查找条款(root)
  getClauseWithType: async () => {
    let clauseQuery = new AV.Query('WordsLawClause')
    clauseQuery.equalTo('clauseId', clauseId)
  },

  getWordWithId: async (wordId) => {
    let wordQuery = new AV.Query('Word')
    wordQuery.equalTo('wordId', wordId)
    return wordQuery.first({ useMasterKey })
  },

  getSameWordRelation: async(word) => {
    let relationQuery = new AV.Query('WordsRelation')
    relationQuery.equalTo('word', word)
    return relationQuery.first({ useMasterKey })
  },

  freeWordRecord: async (name, publicAddress, intranetAddress) => {
    try {
      // let sameWordRecordQuery = new AV.Query('FreeWordQueryRecord')
      // sameWordRecordQuery.equalTo('name', name)
      // let sameWord = await sameWordRecordQuery.first({ useMasterKey })
      if (false) {
        // console.log('exist sameName word')
        // sameWord.increment('count', 1)
        // await sameWord.save({}, { useMasterKey })
      } else {
        // console.log('not exist sameName word')
        let Record = AV.Object.extend('FreeWordQueryRecord')
        let record = new Record()
        record.set('name', name)
        record.set('publicAddress', publicAddress)
        record.set('intranetAddress', intranetAddress)
        await record.save({}, { useMasterKey })
      }
    } catch (e) {
      console.log('error in free word record', e.message)
    }
  }
}

const token = req => {
  return { sessionToken: req.headers['x-lc-session'] }
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

// 创建角色记录
const createRoleRecord = async (username, roleName, typeName, time, mark) => {
  let nowDateTime = (new Date()).getTime()
  // 查询之前记录
  let oldRecorQuery = new AV.Query('RoleRecord')
  oldRecorQuery.equalTo('username', username)
  oldRecorQuery.equalTo('roleName', roleName)
  oldRecorQuery.descending('expiryTime')
  let oldRecordResult = await oldRecorQuery.find({useMasterKey: true})
  if (oldRecordResult[0]) {
    console.log('用户拥有相同角色记录')
    let oldTime = oldRecordResult[0].attributes.expiryTime.getTime()
    if (oldTime > nowDateTime) {
      console.log('用户记录依然有效，从上个时间点延期')
      nowDateTime = oldTime
    } else console.log('用户记录已过期，从现在开始计时')
  }

  let RoleRecord = AV.Object.extend('RoleRecord')
  let roleRecord = new RoleRecord()
  
  let msec = time * 24 * 60 * 60 * 1000 + nowDateTime
  let expiryTime = new Date(msec)
  let active = false

  let newRoleRecord = await roleRecord.save({
    username, roleName, typeName, expiryTime, mark, active}, {useMasterKey: true})
  
    return {
      oldRoleRecord: oldRecordResult[0]? oldRecordResult[0]: null,
      newRoleRecord
    }
}
