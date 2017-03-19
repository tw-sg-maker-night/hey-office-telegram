'use strict';

const util = require('util')
const AWS = require('aws-sdk')
const TelegramBot = require('node-telegram-bot-api')

const botName = process.env.LEX_BOT_NAME
const aliasName = process.env.LEX_BOT_ALIAS
var defaultUserId = "123456789"

function inspect(obj) {
  return util.inspect(obj, false, null)
}

const Lex = new AWS.LexRuntime({
  apiVersion: '2016-11-28',
  signatureVersion: 'v4',
  region: 'us-east-1'
})

function buildLexRequestParams(messageText, userId) {
  return {
    botAlias: aliasName,
    botName: botName,
    inputText: messageText,
    userId: userId,
    sessionAttributes: {}
  }
}

module.exports.webhook = (event, context, callback) => {
  console.log("Event = " + inspect(event))
  var telegramMessage = JSON.parse(event.body).message || { chat: {} }
  var params = buildLexRequestParams(telegramMessage.text, defaultUserId)

  Lex.postText(params, function(err, lexResponse) {
    if (err) {
      console.log("Lex Error: ", inspect(err))
      return
    }
    var bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false})
    bot.sendMessage(telegramMessage.chat.id, lexResponse.message)
  })

  // Always return success to confirm we've received the message (unless there was an exception)
  callback(null, {statusCode: 200, body: ""})
}
