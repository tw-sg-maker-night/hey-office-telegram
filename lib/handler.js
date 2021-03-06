'use strict';

const util = require('util')
const AWS = require('aws-sdk')
const Telegram = require('./telegram')
const ChatSession = require('./chat_session')

const telegramBotName = '@HeyOfficeBot'
const defaultUserId = '23456789'
const stopError = 'stopped'

const inspect = (obj) => {
  return util.inspect(obj, false, null)
}

const buildLexRequestParams = (messageText, userId, sessionAttributes = null) => {
  var params = {
    botAlias: process.env.LEX_BOT_ALIAS,
    botName: process.env.LEX_BOT_NAME,
    inputText: messageText,
    userId: userId.toString()
  }
  if (sessionAttributes) {
    params.sessionAttributes = sessionAttributes
  }
  return params
}

const botNameInMessageText = (text) => {
  return text.includes(telegramBotName)
}

const isStartCommand = (message) => {
  return false
}

const isStopCommand = (message) => {
  const text = message.text.toLowerCase()
  return text.includes('shut up')
}

const ifBotShouldRespond = (message) => {
  return new Promise((resolve, reject) => {
    if (message.chat.type == 'private') {
      resolve(message)
      return
    }
    if (isStopCommand(message)) {
      ChatSession.stopChatSession(message.chat.id)
      reject(stopError)
      return
    }
    if (isStartCommand(message) || botNameInMessageText(message.text)) {
      ChatSession.startChatSession(message.chat.id)
      message.text = message.text.replace(telegramBotName, '').trim()
      resolve(message)
    } else {
      ChatSession.isChatSessionStarted(message.chat.id, (error, result) => {
        if (error || !result) {
          reject()
        } else {
          resolve(message)
        }
      })
    }
  })
}

const forwardToLex = (message) => {
  return new Promise((resolve, reject) => {
    const Lex = new AWS.LexRuntime({apiVersion: '2016-11-28', signatureVersion: 'v4', region: 'us-east-1'})
    const params = buildLexRequestParams(message.text, message.from.id)
    console.log("Lex Request = ", inspect(params))
    Lex.postText(params, (error, response) => {
      console.log("Lex Response = ", inspect(response))
      if (error) {
        reject(error)
      }
      if (response.dialogState == 'Fulfilled' || response.dialogState == 'Failed') {
        ChatSession.stopChatSession(message.chat.id)
      }
      resolve(response)
    })
  })
}

const parseTelegramMessage = (event) => {
  return JSON.parse(event.body).message || { chat: {}, from: {}, text: "" }
}

module.exports.webhook = (event, context, callback) => {
  console.log("Telegram Event = " + inspect(event))
  const message = parseTelegramMessage(event)

  ifBotShouldRespond(message)
  .then(forwardToLex)
  .then((response) => {
    Telegram.sendMessage(message.chat.id, response.message)
    callback(null, {statusCode: 200, body: ""})
  }).catch((error) => {
    console.log("Error:", error)
    if (error === stopError) {
      Telegram.sendMessage(message.chat.id, "I'll be quiet")
    }
    callback(null, {statusCode: 200, body: ""})
  })
}
