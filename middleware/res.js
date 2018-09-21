/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   res.js                                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: Jianjin Wu <mosaic101@foxmail.com>         +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2017/05/15 14:57:04 by Jianjin Wu        #+#    #+#             */
/*   Updated: 2018/03/30 14:49:36 by Jianjin Wu       ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


const debug = require('debug')('app:res')
// const { getconfig } = require('getconfig')
// const fundebug = require('../utils/fundebug')
// const logger = Logger('app:res')

const DEFAULT_SUCCESS_STATUS = 200
const DEFAULT_ERROR_STATUS = 403

//http code 
const httpCode = {
  200: 'ok',
  400: 'invalid parameters',
  401: 'Authentication failed',
  403: 'forbidden',
  404: 'not found',
  500: 'system error'
}

module.exports = (req, res, next) => {
  /**
  * success response
  * @param {any} data 
  * @param {number} status - default 200
  */
  res.success = (data, status) => {
    let result = JSON.stringify(data)
    status = status || DEFAULT_SUCCESS_STATUS
    return res.status(status).json({ 
      code: 200, 
      message: '', 
      result, 
      state: true
    })
  }

  res.error = (err, status, code) => {
    if (typeof err == 'string') err = new Error(err)
    status = status || 200
    code = err.code || code || 200
    let message = err.rawMessage || err.message
    res.status(status).json({ 
      code, 
      message, 
      result: '', 
      state: false
    })
  }

  next()

}
