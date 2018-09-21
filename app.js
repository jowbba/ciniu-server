'use strict';
var fs = require('fs')
var express = require('express');
var timeout = require('connect-timeout');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var FileStreamRotator = require('file-stream-rotator');
var AV = require('leanengine');

// 加载云函数定义，你可以将云函数拆分到多个文件方便管理，但需要在主文件中加载它们
require('./cloud');

var app = express();

// // 设置模板引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static('public'));

// app.use(logger('dev'));

//设置日志文件目录
var logDirectory=__dirname+'/logs';
//确保日志文件目录存在 没有则创建
fs.existsSync(logDirectory)||fs.mkdirSync(logDirectory);

//创建一个写路由
var accessLogStream=FileStreamRotator.getStream({
    filename:logDirectory+'/accss-%DATE%.log',
    frequency:'daily',
    verbose:false
})

app.use(logger('combined',{stream:accessLogStream}));//写入日志文件


// 设置默认超时时间
app.use(timeout('60s'));

// 加载云引擎中间件
app.use(AV.express());

app.use(require('./middleware/res'))

app.enable('trust proxy');
// 需要重定向到 HTTPS 可去除下一行的注释。
// app.use(AV.Cloud.HttpsRedirect());

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(cookieParser());

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With,X-LC-Session");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

app.get('/', function(req, res) {
  res.render('index', { currentTime: new Date() });
});

// 可以将一类的路由单独保存在一个文件中
app.use('/user', require('./routes/v0/user'))

app.use('/token', require('./routes/v0/sessionToken'))

app.use('/word', require('./routes/v0/word'))

app.use('/type', require('./routes/v0/dbType'))

app.use('/category', require('./routes/v0/category'))

app.use('/ocr', require('./routes/v0/ocr'))

app.use('/pay', require('./routes/v0/pay'))

app.use('/version', require('./routes/v0/version'))

app.use('/consume', require('./routes/v0/consume'))

app.use('/query', require('./routes/v0/query'))

app.use('/v1.0', require('./routes/v1'))

app.use('/v1.1', require('./routes/v1.1'))

app.use(function(req, res, next) {
  // 如果任何一个路由都没有返回响应，则抛出一个 404 异常给后续的异常处理器
  if (!res.headersSent) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  }
});

// error handlers
app.use(function(err, req, res, next) {
  if (req.timedout && req.headers.upgrade === 'websocket') {
    // 忽略 websocket 的超时
    return;
  }

  var statusCode = err.status || 500;
  if (statusCode === 500) {
    console.error(err.stack || err);
  }
  if (req.timedout) {
    console.error('请求超时: url=%s, timeout=%d, 请确认方法执行耗时很长，或没有正确的 response 回调。', req.originalUrl, err.timeout);
    res.error('请求超时')
  }
  res.status(statusCode);
  // 默认不输出异常详情
  var error = {};
  if (app.get('env') === 'development') {
    // 如果是开发环境，则将异常堆栈输出到页面，方便开发调试
    error = err;
  }
  res.render('error', {
    message: err.message,
    error: error
  });
});

module.exports = app;
