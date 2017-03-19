'use strict';

const util = require('util')
const AWS = require('aws-sdk')
const Telegram = require('./lib/telegram')

var defaultUserId = "123456789"

function inspect(obj) {
  return util.inspect(obj, false, null)
}

function buildLexRequestParams(messageText, userId) {
  return {
    botAlias: process.env.LEX_BOT_ALIAS,
    botName: process.env.LEX_BOT_NAME,
    inputText: messageText,
    userId: userId,
    sessionAttributes: {}
  }
}

module.exports.webhook = (event, context, callback) => {
  console.log("Event = " + inspect(event))
  const Lex = new AWS.LexRuntime({apiVersion: '2016-11-28', signatureVersion: 'v4', region: 'us-east-1'})
  var telegramMessage = JSON.parse(event.body).message || { chat: {} }
  var params = buildLexRequestParams(telegramMessage.text, defaultUserId)
  var chatType = telegramMessage.chat.type

  Lex.postText(params, function(err, lexResponse) {
    console.log("Lex Error = ", inspect(err))
    console.log("Lex Response = ", inspect(lexResponse))
    if (err) {
      return
    }
    // Hack: Need a better way to know if response should be returned to chat group
    if (chatType == 'group' && lexResponse.message == 'Sorry, can you please repeat that?') {
      console.log("Not sending response to telegram chat. Message probably was not be intended for Lex.")
    } else {
      Telegram.sendMessage(telegramMessage.chat.id, lexResponse.message)
    }
  })

  // Always return success to confirm we've received the message (unless there was an exception)
  callback(null, {statusCode: 200, body: ""})
}
