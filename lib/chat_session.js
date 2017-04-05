"use strict"

const AWS = require('aws-sdk')

const TABLE_NAME = 'telegram_chat_group'

const dynamoDb = () => {
  return new AWS.DynamoDB.DocumentClient()
}

module.exports = {

  isChatSessionStarted: (chatId, callback) => {
    callback = callback != null ? callback : () => {}
    const params = {
      TableName: TABLE_NAME,
      Key: {"chatId": chatId.toString()}
    }
    dynamoDb().get(params, (error, response) => {
      return callback(error, response.Item != null)
    })
  },

  startChatSession: (chatId, callback) => {
    callback = callback != null ? callback : () => {}
    const params = {
      TableName: TABLE_NAME,
      Item: {"chatId": chatId.toString()}
    }
    dynamoDb().put(params, callback)
  },

  stopChatSession: (chatId, callback) => {
    callback = callback != null ? callback : () => {}
    const params = {
      TableName: TABLE_NAME,
      Key: {"chatId": chatId.toString()}
    }
    dynamoDb().delete(params, callback)
  }

}
