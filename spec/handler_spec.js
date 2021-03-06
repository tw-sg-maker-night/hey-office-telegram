'use strict'

const expect = require('chai').expect
const sinon = require('sinon')
const AWS = require('aws-sdk-mock')
const Telegram = require('../lib/telegram')
const ChatSession = require('../lib/chat_session')
const webhook = require('../lib/handler').webhook

describe('webhook', () => {
  let event = {}
  let context = {}
  let sendMessageStub = null
  let lexPostTextStub = null

  beforeEach(() => {
    process.env.LEX_BOT_NAME = "HeyOffice"
    process.env.LEX_BOT_ALIAS = "$LATEST"

    lexPostTextStub = sinon.stub().callsArgWith(1, null, {message: "Hi"})
    AWS.mock('LexRuntime', 'postText', lexPostTextStub)
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
      let callback = (_, response) => {
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
      sinon.stub(ChatSession, 'isChatSessionStarted').callsFake((_, callback) => { callback(null, false) })
    })

    afterEach(() => {
      ChatSession.isChatSessionStarted.restore()
    })

    it('should always return success', (done) => {
      let callback = (_, response) => {
        expect(response.statusCode).to.equal(200)
        done()
      }
      webhook(event, context, callback)
    })

    it('should not respond to normal messages', (done) => {
      let callback = (_, response) => {
        expect(sendMessageStub.called).to.be.false
        done()
      }
      webhook(event, context, callback)
    })

    describe('when addressed directly', () => {
      let startChatSessionStub = null

      beforeEach(() => {
        event = {body: JSON.stringify({message: {chat: {id: "chat-001", type: "group"}, from: {id: "user-001"}, text: "@HeyOfficeBot do something for me"}})}
        startChatSessionStub = sinon.stub(ChatSession, 'startChatSession')
      })

      afterEach(() => {
        startChatSessionStub.restore()
      })

      it('should forward the message to Lex (without the bot name)', (done) => {
        let callback = (_, response) => {
          expect(lexPostTextStub.called).to.be.true
          sinon.assert.calledWith(lexPostTextStub, sinon.match.has("inputText", "do something for me"))
          done()
        }
        webhook(event, context, callback)
      })

      it('should respond with the lex response', (done) => {
        let callback = (_, response) => {
          expect(sendMessageStub.calledWith('chat-001', 'Hi')).to.be.true
          done()
        }
        webhook(event, context, callback)
      })

      it('should start a chat session', (done) => {
        let callback = (_, response) => {
          expect(startChatSessionStub.calledWith('chat-001')).to.be.true
          done()
        }
        webhook(event, context, callback)
      })
    })

    describe('when asked to shut up', () => {
      let stopChatSessionStub

      beforeEach(() => {
        event = {body: JSON.stringify({message: {chat: {id: "chat-001", type: "group"}, from: {id: "user-001"}, text: 'shut up'}})}
        stopChatSessionStub = sinon.stub(ChatSession, 'stopChatSession')
      })

      afterEach(() => {
        stopChatSessionStub.restore()
      })

      it('should respond appropriately', (done) => {
        let callback = (_, response) => {
          expect(sendMessageStub.calledWith('chat-001', 'I\'ll be quiet')).to.be.true
          done()
        }
        webhook(event, context, callback)
      })

      it('should stop a chat session', (done) => {
        let callback = (_, response) => {
          expect(stopChatSessionStub.calledWith('chat-001')).to.be.true
          done()
        }
        webhook(event, context, callback)
      })
    })

  })

})
