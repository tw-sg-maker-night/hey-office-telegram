"use strict"

const AWS = require('aws-sdk')

const TABLE_NAME = 'telegram_chat_group'
const CHAT_ID_FIELD = 'chatId'
const CREATED_AT_FIELD = 'createdAt'

function dynamoDb() {
  return new AWS.DynamoDB.DocumentClient()
}

module.exports = {

  isChatSessionStarted: function(chatId, callback) {
    const params = {
      TableName: TABLE_NAME,
      Key: {CHAT_ID_FIELD: chatId}
    }
    dynamoDb().get(params, callback)
  },

  startChatSession: function(chatId, callback) {
    const params = {
      TableName: TABLE_NAME,
      Item: {CHAT_ID_FIELD: chatId}
    }
    dynamoDb().put(params, callback)
  },

  stopChatSession: function(chatId, callback) {
    const params = {
      TableName: TABLE_NAME,
      Key: {CHAT_ID_FIELD: chatId}
    }
    dynamoDb().delete(params, callback)
  }

}
