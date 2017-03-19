'use strict'

const expect = require('chai').expect
const sinon = require('sinon')
const AWS = require('aws-sdk-mock')
const Telegram = require('../lib/telegram')
const webhook = require('../handler').webhook

describe('webhook', () => {
  var event = {body: JSON.stringify({message: {chat: {type: "private"}, text: "Hello"}})}
  var context = {}

  beforeEach(() => {
    process.env.LEX_BOT_NAME = "HeyOffice"
    process.env.LEX_BOT_ALIAS = "$LATEST"
    AWS.mock('LexRuntime', 'postText', function (params, callback){
      callback(null, {message: "Hi"});
    })
    sinon.stub(Telegram, 'sendMessage').callsFake(() => {})
  })

  describe('with a valid telegram request', () => {
    it('should always return success', (done) => {
      var callback = (_, response) => {
        expect(response.statusCode).to.equal(200)
        done()
      }
      webhook(event, context, callback)
    })
  })

})
