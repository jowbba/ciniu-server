/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   error.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: Jianjin Wu <mosaic101@foxmail.com>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2017/09/05 17:17:42 by Jianjin Wu        #+#    #+#             */
/*   Updated: 2018/03/30 14:49:35 by Jianjin Wu       ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


/**
 * FIXME: 优化构造函数
 * 资源级别的 error，带入唯一标识符 id， 
 * 方便直接在 error 日志明确具体的资源位置定位 error 并且能快速修复
 * such as： new UserNotExist(userId)
 * log: userId: xxxxxxx not exist
 */
const E = {}

// generate function
const EClass = (code, message) => {
  return class extends Error {
    constructor(m = message) {
      super(m)
      this.code = code
    }
  }
}

const define = (name, code, message) => E[name] = EClass(code, message)

/**
 * Error Code
 * such as: 60001，固定长度为5位整数！ 
 * 6 											 00 		     01
 * 服务级错误               服务模块代码	具体错误代码
 */

// code 127 无效的手机号码
// code 210 用户名密码不匹配
// code 305 条件不满足（余额？）


// common: 600xx
define('UsernameRequired', 60000, 'username is required')
define('PasswordRequired', 60001, 'password is required')
define('SmsCodeRequired', 60002, 'smscode is required')

// user: 601XX
define('UserNotExist', 60100, 'user not exist')
define('UserAlreadyExist', 60101, 'user already exist')
define('InvalidPhoneNumber', 60103, 'invalid phone number')
define('SmsCodeError', 60103, 'sms code error')
define('WechatAlreadyAssociated', 60104, 'wechat has been associated')

// query: 602xx
define('LisenceForbid', 60200, 'action need lisence')
define('InsufficientProbationImg', 60201, 'insufficient probational image')
define('InsufficientBalance', 60202, 'insufficient balance')
module.exports = Object.freeze(E)
