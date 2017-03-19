'use strict';

const util = require('util')
const http  = require('http')
const https = require('https')
const request = require('request-promise')
const aws4 = require('aws4')
const TelegramBot = require('node-telegram-bot-api')

function inspect(obj) {
  return util.inspect(obj, false, null)
}

module.exports.webhook = (event, context, callback) => {
  console.log("Event = " + inspect(event))

  var message = JSON.parse(event.body).message || { chat: {} }

  var botName = process.env.LEX_BOT_NAME
  var aliasName = process.env.LEX_BOT_ALIAS
  var userId = "123456789"

  var body = JSON.stringify({
    inputText: message.text,
    sessionAttributes: {}
  })

  var options = {
    service: "lex",
    host: "runtime.lex.us-east-1.amazonaws.com",
    path: "/bot/"+botName+"/alias/"+aliasName+"/user/"+userId+"/text",
    region: "us-east-1",
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: body
  }

  // console.log("AWS_ACCESS_KEY_ID = " + process.env.AWS_ACCESS_KEY_ID)
  // console.log("AWS_SECRET_ACCESS_KEY = " + process.env.AWS_SECRET_ACCESS_KEY)

  var signedOptions = aws4.sign(options)
  console.log("Signed Options = " + inspect(signedOptions))

  var req = https.request(signedOptions, (response) => {
    console.log('STATUS: ' + response.statusCode)
    console.log('HEADERS: ' + JSON.stringify(response.headers))
    response.setEncoding('utf8')
    response.on('data', function (chunk) {
      console.log('BODY: ' + chunk)
      var reply = JSON.parse(chunk)

      var bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false})
      console.log("Chat ID = " + message.chat.id)
      console.log("Response = " + reply.message)
      bot.sendMessage(message.chat.id, reply.message)
    })
  })

  req.on('error', function(e) {
    console.log('Lex Error Msg = ' + e.message)
    console.log("Lex Error = " + inspect(e))
  })

  req.write(body)
  req.end()

  callback(null, {statusCode: 200, body: ""})
};
