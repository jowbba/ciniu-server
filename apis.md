# 词库API

## 用户API

### 请求注册验证码 POST /user/code
#### Body(application/json)
> username(required) STRING

#### Response
> message STRING


### 注册用户 POST /user
#### Body(application/json)
> username(required) STRING
> password(required) STRING
> code(required) STRING

#### Response
> sessionToken STRING


### 请求修改验证码 POST /user/pwdcode
#### Body(application/json)
> username(required) STRING

#### Response
> message STRING


### 修改密码 POST /user/password
#### Body(application/json)
> password(required) STRING
> code(required) STRING

#### Response
> updatedAt STRING
> objectId STRING



### 登录 POST /token
#### Body(application/json)
> username(required) STRING
> password(required) STRING

#### Response
> sessionToken STRING

### 查询用户信息 GET /
#### Header
> X-LC-Session

#### Response
> points STRING
> roles ARRAY
> count NUMBER
> countWord NUMBER

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


### 创建词关系 POST /word/relation
#### Header
> X-LC-Session
#### Body(application/json)
> typeCode(required) NUMBER
> wordCode(required) NUMBER
> categoryCode(required) NUMBER

___

## 自定义词库
### 创建自定义词关系 POST /custom/relation
#### Header
> X-LC-Session
#### Body(application/json)
> name(required) STRING
> typeCode(required) NUMBER
> categoryCode(required) NUMBER

___

## 版本API
```
"version": 最新客户端版本号
"minimum": 最低支持客户端版本号
"objectId": 该对象唯一的 Id 标识
"createAt": 该对象被创建的 UTC 时间
"updateAt": 该对象最后一次被修改的时间
```

### 获取版本信息 GET /version
#### Header
> X-LC-Session

#### Response
> latest-api STRING
> minimum-api STRING
> lastes-client STRING


___

## OCR
### OCR查询 POST /ocr
#### Header
> X-LC-Session

#### Body(application/json)
> image(required) STRING
> recognize_granularity(required) STRING
> vertexes_location(required) STRING


#### Response
> log_id STRING
> words_result_num NUMBER
> words_result ARRAY

___

## 点数
### 消费点数 POST /consume 
#### Header
> X-LC-Session

#### Body(application/json)
> count(required) NUMBER
> fileName(required) STRING


#### Response
> user OBJECT 

___

## 用户设置
```
"imageActive": 开关1
"customActive": 开关2
"notSelectedType": 开启的分类
"notSelectedCategory": 开启的类目
"createAt": 该对象被创建的 UTC 时间
"updateAt": 该对象最后一次被修改的时间
```
### 获取用户设置 GET /setting
#### Header
> X-LC-Session

#### Response
> result OBJECT

### 获取用户设置 POST /setting
#### Header
> X-LC-Session
#### Body
> customActive(boolen)
> imageActive(boolen)
> notSelectedType(array)
> notSelectedCategory(array)

#### Response
> result OBJECT

___

## 自定义词库
```
"name": 词名
"wordsDBType": 所属分类
"wordsCategory": 所属类目
"username": 创建用户
"objectId": 该对象唯一的 Id 标识
"createAt": 该对象被创建的 UTC 时间
"updateAt": 该对象最后一次被修改的时间
```
### 创建自定义词关系 PATCH /custom
#### Header
> X-LC-Session
#### Body(application/json)
> typeCode(required) ARRAY
> name(required) STRING
> categoryCode(required) ARRAY

#### Response
> result OBJECT

### 删除自定义词关系 DELETE /custom
#### Header
> X-LC-Session
#### Body(application/json)
> name(required) STRING

### 修改自定义词关系 PATCH /custom
#### Header
> X-LC-Session
#### Body(application/json)
> typeCode ARRAY
> name(required) STRING
> categoryCode ARRAY

### 查询自定义词关系 GET /custom
#### Header
> X-LC-Session

#### Response
> result ARRAY

___

## 模版
### 获取模版地址
### 查询词关系 GET /templates
#### Header
> X-LC-Session

#### Response
> result STRING















