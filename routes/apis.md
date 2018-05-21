# 词库API

## 用户API
```
“username”: username
"password": password
```
### 创建用户 POST /user
#### Body(application/json)
> username(required) STRING
> password(required) STRING

#### Response
> sessionToken STRING

### 登录 POST /token
#### Body(application/json)
> username(required) STRING
> password(required) STRING

___

## 词库分类API
```
"name": name of WordsDBType
"version": version of WordsDBType
"code": code of WordsDBType
"objectId": 该对象唯一的 Id 标识
"createAt": 该对象被创建的 UTC 时间
"updateAt": 该对象最后一次被修改的时间
```

### 查询所有分类 GET /type
#### Header
> X-LC-Session


### 创建新分类 POST /type
#### Header
> X-LC-Session
#### Body(application/json)
> name(required) STRING
> version(required) NUMBER
> code(required) NUMBER


### 更新分类 PATCH /type
#### Header
> X-LC-Session
#### Body(application/json)
> name STRING
> version NUMBER
> code NUMBER


### 删除分类 DELETE /type/:id
#### Header
> X-LC-Session

___

## 词库类目API
```
"name": name of category
"pid": pid of category
"code": code of category
"objectId": 该对象唯一的 Id 标识
"createAt": 该对象被创建的 UTC 时间
"updateAt": 该对象最后一次被修改的时间
```

### 查询所有类目 GET /category
#### Header
> X-LC-Session



### 创建新类目 POST /category
#### Header
> X-LC-Session
#### Body(application/json)
> name(required) STRING
> pCode(required) NUMBER
> code(required) NUMBER


### 更新类目 PATCH /category
#### Header
> X-LC-Session
#### Body(application/json)
> name STRING
> pCode NUMBER
> code NUMBER


### 删除类目 DELETE /category/:id
#### Header
> X-LC-Session

___

## 词库API
```
"name": name of category
"marks": marks of category
"code": code of category
"typeArr": array of type
"categoryArr": array of category
"objectId": 该对象唯一的 Id 标识
"createAt": 该对象被创建的 UTC 时间
"updateAt": 该对象最后一次被修改的时间
```

### 查询词 GET /word
#### params
> limit 
> skip
#### Header
> X-LC-Session


### 创建词 POST /word
#### Header
> X-LC-Session
#### Body(application/json)
> name(required) STRING
> marks(required) STRING
> code(required) NUMBER
> wordsDBTypeID  ARRAY  [objectId of wordsDBType]
> wordsCategoryID ARRAY [objectId of wordsCategoryID]


### 更新词 PATCH /word
#### Header
> X-LC-Session
#### Body(application/json)
> name STRING
> marks STRING
> code NUMBER
> wordsDBTypeID  ARRAY  [objectId of wordsDBType]
> wordsCategoryID ARRAY [objectId of wordsCategoryID]

### 删除词 DELETE /word/:id
#### Header
> X-LC-Session
