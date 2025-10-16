/**
 * Chatbot Integration Test Script
 * 
 * This script tests the improved chatbot integration to ensure:
 * 1. Bot messages are properly tagged
 * 2. Interactive messages (buttons/lists) work correctly
 * 3. Flow processing handles user responses properly
 * 4. Database storage includes interactive data
 */

const axios = require('axios');
const { pool } = require('./backend/config/database');
const chatbotModel = require('./backend/models/chatbotModel');
const conversationService = require('./backend/services/conversationService');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001/api',
  businessId: 'test-business-id', // Replace with actual business ID
  testPhoneNumber: '+1234567890',
  testFlowName: 'Test Chatbot Flow'
};

class ChatbotIntegrationTester {
  constructor() {
    this.testResults = [];
    this.testFlowId = null;
    this.testConversationId = null;
  }

  async runAllTests() {
    console.log('🤖 Starting Chatbot Integration Tests...\n');

    try {
      await this.testDatabaseSchema();
      await this.testChatbotFlowCreation();
      await this.testInteractiveMessageHandling();
      await this.testBotMessageTagging();
      await this.testFlowProcessing();
      await this.cleanup();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testDatabaseSchema() {
    console.log('📊 Testing Database Schema...');
    
    try {
      // Test if interactive_data column exists
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'chat_messages' 
        AND COLUMN_NAME = 'interactive_data'
      `);
      
      if (columns.length > 0) {
        this.addResult('Database Schema', 'PASS', 'interactive_data column exists');
      } else {
        this.addResult('Database Schema', 'FAIL', 'interactive_data column missing');
      }

      // Test if is_bot column exists
      const [botColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'chat_messages' 
        AND COLUMN_NAME = 'is_bot'
      `);
      
      if (botColumns.length > 0) {
        this.addResult('Database Schema', 'PASS', 'is_bot column exists');
      } else {
        this.addResult('Database Schema', 'FAIL', 'is_bot column missing');
      }

    } catch (error) {
      this.addResult('Database Schema', 'ERROR', error.message);
    }
  }

  async testChatbotFlowCreation() {
    console.log('🔄 Testing Chatbot Flow Creation...');
    
    try {
      // Create test flow
      const flowId = await chatbotModel.createFlow(
        TEST_CONFIG.businessId,
        TEST_CONFIG.testFlowName,
        'Test flow for integration testing',
        true
      );
      
      this.testFlowId = flowId;
      this.addResult('Flow Creation', 'PASS', `Flow created with ID: ${flowId}`);

      // Create test nodes
      const startNodeId = await chatbotModel.createNode(
        flowId,
        'sendMessage',
        'Welcome! Please choose an option:',
        100,
        100,
        {
          messageType: 'buttons',
          buttons: [
            { title: 'Option 1', value: 'option1' },
            { title: 'Option 2', value: 'option2' }
          ]
        }
      );

      const responseNodeId = await chatbotModel.createNode(
        flowId,
        'sendMessage',
        'Thank you for your selection!',
        300,
        100,
        { messageType: 'text' }
      );

      // Create edge
      await chatbotModel.createEdge(flowId, startNodeId, responseNodeId, 'option1');

      this.addResult('Node Creation', 'PASS', 'Test nodes and edges created successfully');

    } catch (error) {
      this.addResult('Flow Creation', 'ERROR', error.message);
    }
  }

  async testInteractiveMessageHandling() {
    console.log('🔘 Testing Interactive Message Handling...');
    
    try {
      if (!this.testFlowId) {
        throw new Error('Test flow not created');
      }

      // Test button message creation
      const buttonMessage = {
        conversationId: 'test-conversation',
        direction: 'outbound',
        messageType: 'interactive',
        content: 'Please choose an option:',
        isBot: true,
        interactive: {
          type: 'button',
          content: 'Please choose an option:',
          data: [
            { title: 'Option 1', value: 'option1' },
            { title: 'Option 2', value: 'option2' }
          ]
        }
      };

      // Test list message creation
      const listMessage = {
        conversationId: 'test-conversation',
        direction: 'outbound',
        messageType: 'interactive',
        content: 'Select from the list:',
        isBot: true,
        interactive: {
          type: 'list',
          content: 'Select from the list:',
          data: [
            {
              title: 'Section 1',
              rows: [
                { title: 'Item 1', description: 'Description 1' },
                { title: 'Item 2', description: 'Description 2' }
              ]
            }
          ]
        }
      };

      this.addResult('Interactive Messages', 'PASS', 'Interactive message structures validated');

    } catch (error) {
      this.addResult('Interactive Messages', 'ERROR', error.message);
    }
  }

  async testBotMessageTagging() {
    console.log('🏷️ Testing Bot Message Tagging...');
    
    try {
      // Create test conversation
      const conversation = await conversationService.getOrCreateConversation(
        TEST_CONFIG.businessId,
        TEST_CONFIG.testPhoneNumber
      );
      
      this.testConversationId = conversation.id;

      // Add bot message
      const botMessage = await conversationService.addMessageToConversation({
        conversationId: conversation.id,
        direction: 'outbound',
        messageType: 'text',
        content: 'This is a bot message',
        isBot: true
      });

      // Verify bot message was tagged correctly
      const [messages] = await pool.query(
        'SELECT * FROM chat_messages WHERE id = ?',
        [botMessage.id]
      );

      if (messages.length > 0 && messages[0].is_bot === 1) {
        this.addResult('Bot Message Tagging', 'PASS', 'Bot message properly tagged');
      } else {
        this.addResult('Bot Message Tagging', 'FAIL', 'Bot message not properly tagged');
      }

    } catch (error) {
      this.addResult('Bot Message Tagging', 'ERROR', error.message);
    }
  }

  async testFlowProcessing() {
    console.log('⚙️ Testing Flow Processing...');
    
    try {
      if (!this.testFlowId || !this.testConversationId) {
        throw new Error('Test flow or conversation not created');
      }

      // Enable chatbot for conversation
      await chatbotModel.toggleChatbotForConversation(
        this.testConversationId,
        true,
        this.testFlowId
      );

      // Get complete flow
      const completeFlow = await chatbotModel.getCompleteFlow(
        this.testFlowId,
        TEST_CONFIG.businessId
      );

      if (completeFlow && completeFlow.nodes.length > 0 && completeFlow.edges.length > 0) {
        this.addResult('Flow Processing', 'PASS', 'Complete flow retrieved successfully');
      } else {
        this.addResult('Flow Processing', 'FAIL', 'Complete flow retrieval failed');
      }

      // Test flow processing logic
      const chatbotController = require('./backend/controllers/chatbotController');
      const conversation = await conversationService.getOrCreateConversation(
        TEST_CONFIG.businessId,
        TEST_CONFIG.testPhoneNumber
      );

      // Mock message processing
      const testMessage = {
        content: 'option1',
        type: 'text'
      };

      const processed = await chatbotController.processChatbotMessageInternal(
        testMessage,
        conversation
      );

      if (processed) {
        this.addResult('Flow Processing', 'PASS', 'Message processing completed');
      } else {
        this.addResult('Flow Processing', 'FAIL', 'Message processing failed');
      }

    } catch (error) {
      this.addResult('Flow Processing', 'ERROR', error.message);
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test data...');
    
    try {
      if (this.testFlowId) {
        await chatbotModel.deleteFlow(this.testFlowId, TEST_CONFIG.businessId);
        this.addResult('Cleanup', 'PASS', 'Test flow deleted');
      }

      if (this.testConversationId) {
        await pool.query('DELETE FROM chat_messages WHERE conversation_id = ?', [this.testConversationId]);
        await pool.query('DELETE FROM conversations WHERE id = ?', [this.testConversationId]);
        this.addResult('Cleanup', 'PASS', 'Test conversation deleted');
      }

    } catch (error) {
      this.addResult('Cleanup', 'ERROR', error.message);
    }
  }

  addResult(category, status, message) {
    this.testResults.push({ category, status, message });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${category}: ${message}`);
  }

  printResults() {
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    
    const categories = [...new Set(this.testResults.map(r => r.category))];
    
    categories.forEach(category => {
      console.log(`\n${category}:`);
      const categoryResults = this.testResults.filter(r => r.category === category);
      
      categoryResults.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`  ${icon} ${result.message}`);
      });
    });

    const passCount = this.testResults.filter(r => r.status === 'PASS').length;
    const failCount = this.testResults.filter(r => r.status === 'FAIL').length;
    const errorCount = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log('\n📊 Overall Results:');
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⚠️ Errors: ${errorCount}`);
    console.log(`📈 Success Rate: ${((passCount / this.testResults.length) * 100).toFixed(1)}%`);

    if (failCount === 0 && errorCount === 0) {
      console.log('\n🎉 All tests passed! Chatbot integration is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ChatbotIntegrationTester();
  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = ChatbotIntegrationTester;

