'use strict'

const expect = require('chai').expect
const sinon = require('sinon')
const AWS = require('aws-sdk-mock')
const Telegram = require('../lib/telegram')
const ChatSession = require('../lib/chat_session')
const webhook = require('../lib/handler').webhook

describe('webhook', () => {
  var event = {}
  var context = {}
  var sendMessageStub = null

  beforeEach(() => {
    process.env.LEX_BOT_NAME = "HeyOffice"
    process.env.LEX_BOT_ALIAS = "$LATEST"
    AWS.mock('LexRuntime', 'postText', (params, callback) => {
      callback(null, {message: "Hi"});
    })
    sendMessageStub = sinon.stub(Telegram, 'sendMessage').callsFake(() => {})
  })

  afterEach(() => {
      sendMessageStub.restore()
      AWS.restore('LexRuntime')
      AWS.restore('DynamoDB')
  })

  describe('when in a private chat', () => {
    beforeEach(() => {
      event = {body: JSON.stringify({message: {chat: {id: "chat-001", type: "private"}, from: {id: "user-001"}, text: "Hello"}})}
    })

    it('should always return success', (done) => {
      var callback = (_, response) => {
        expect(response.statusCode).to.equal(200)
        done()
      }
      webhook(event, context, callback)
    })

    it('should always respond to messages', (done) => {
      Telegram.sendMessage.restore()
      sinon.stub(Telegram, 'sendMessage').callsFake((chatId, response) => {
        expect(chatId).to.equal("chat-001")
        expect(response).to.equal("Hi")
        done()
      })
      webhook(event, context, () => {})
    })
  })

  describe('when in a group chat', () => {
    beforeEach(() => {
      event = {body: JSON.stringify({message: {chat: {id: "chat-001", type: "group"}, from: {id: "user-001"}, text: "Hello"}})}
    })

    it('should always return success', (done) => {
      var callback = (_, response) => {
        expect(response.statusCode).to.equal(200)
        done()
      }
      webhook(event, context, callback)
    })

    it('should not respond to normal messages', (done) => {
      var callback = (_, response) => {
        expect(sendMessageStub.called).to.be.false
        done()
      }
      webhook(event, context, callback)
    })

    describe('when addressed directly', () => {
      var startChatSessionStub = null

      beforeEach(() => {
        event = {body: JSON.stringify({message: {chat: {id: "chat-001", type: "group"}, from: {id: "user-001"}, text: "@HeyOffice do something for me"}})}
        startChatSessionStub = sinon.stub(ChatSession, 'startChatSession').callsFake((_, callback) => { callback(null, null) })
      })

      afterEach(() => {
        startChatSessionStub.restore()
      })

      it('should respond with the lex response', (done) => {
        var callback = (_, response) => {
          expect(sendMessageStub.calledWith('chat-001', 'Hi')).to.be.true
          done()
        }
        webhook(event, context, callback)
      })

      it('should start a chat session', (done) => {
        var callback = (_, response) => {
          expect(startChatSessionStub.calledWith('chat-001')).to.be.true
          done()
        }
        webhook(event, context, callback)
      })
    })

  })

})
