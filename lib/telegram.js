'use strict'

const TelegramBot = require('node-telegram-bot-api')

module.exports.sendMessage = (chatId, message) => {
  var bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false})
  bot.sendMessage(chatId, message)
}
