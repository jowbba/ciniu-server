var AV = require('leanengine')

module.exports = {
  createErr : (message, code) => {
    return Object.assign(new Error(message), { code })
  },

  // 通过用户名获取用户对象(root)
  getUserWithRoot : async (username) => {
    let userQuery = new AV.Query('_User')
    userQuery.equalTo('username', username)
    return await userQuery.find({useMasterKey: true})
  },

  // 获取vip对应role对象(root)
  getVipRoles : async () => {
    let vipRoleQuery = new AV.Query(AV.Role)
    vipRoleQuery.equalTo('name', 'Vip')
    let result = await vipRoleQuery.find({useMasterKey: true})
    if(result.length !== 1) throw new Error('role of vip is not exist')
    return result
  },

  // 查询type对应role(root)
  getRoles : async (types) => {
    let typesResult = []

    for(let i = 0; i < types.length; i++ ) {
      let typeQuery = new AV.Query('WordsDBTypeInfo')
      typeQuery.equalTo('code', types[i])
      typeQuery.include('role')
      let typeResult = await typeQuery.find({useMasterKey: true})
      if (typeResult.length !== 0 && typeResult[0].attributes.role) typesResult.push(...typeResult)
      else throw new Error(` type code ${types[i]} is not exist`)
    }

    typesResult = typesResult

    return typesResult.map(type => type.attributes.role)
  },

  // 查询所有用户可见的 词关系
  getAllRelations: async (req, res) => {
    let relationQuery = new AV.Query('WordsRelationInfo')
      let relationCount = await relationQuery.count(token(req))
      if (relationCount == 0) return res.status(403).json({ message: 'can not found any word belong to user'})
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
      let relations = await Promise.all(queryArr)

      relations = relations.reduce((total, current) => {
        return [...total, ...current]
      }, [])
      relations = JSON.parse(JSON.stringify(relations))
      return relations
  }
}

const token = req => {
  return { sessionToken: req.headers['x-lc-session'] }
}

const split = (count, perSize) => {
  let arr = []
  let position = 0
  while(position < count) {
    arr.push({limit: perSize, skip: position})
    position += perSize
  }
  return arr
}
