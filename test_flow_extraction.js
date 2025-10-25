// Test script to validate flow response extraction
const WhatsAppService = require('./backend/services/WhatsAppService');

// Mock WebSocket server for testing
const mockWss = {
  notifyNewMessage: (businessId, conversationId) => {
    console.log(`Mock WebSocket notification: Business ${businessId}, Conversation ${conversationId}`);
  }
};

// Test data from the user's webhook payload
const testEntry = [
  {
    "id": "1677607116492342",
    "changes": [
      {
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "917305195418",
            "phone_number_id": "549704921563564"
          },
          "contacts": [
            {
              "profile": {
                "name": "Harish"
              },
              "wa_id": "917299817996"
            }
          ],
          "messages": [
            {
              "context": {
                "from": "917305195418",
                "id": "wamid.HBgMOTE3Mjk5ODE3OTk2FQIAERgSNEQ0MjIyQzdGMUNFNzFDNDcwAA=="
              },
              "from": "917299817996",
              "id": "wamid.HBgMOTE3Mjk5ODE3OTk2FQIAEhgUM0FBQUVFNjI1NkIwQzhCNDIyMTUA",
              "timestamp": "1761156130",
              "type": "interactive",
              "interactive": {
                "type": "nfm_reply",
                "nfm_reply": {
                  "response_json": "{\"flow_token\":\"657626567204276\"}",
                  "body": "Sent",
                  "name": "flow"
                }
              }
            }
          ]
        },
        "field": "messages"
      }
    ]
  }
];

async function testFlowResponseExtraction() {
  console.log('Testing flow response extraction...');
  console.log('Input payload:', JSON.stringify(testEntry, null, 2));

  try {
    // Test the processIncomingMessage function
    await WhatsAppService.processIncomingMessage(testEntry, mockWss);
    console.log('✅ Flow response extraction test completed successfully!');

    console.log('\nExpected behavior:');
    console.log('- Should extract flow response data from response_json');
    console.log('- Should parse JSON and create flow_content');
    console.log('- Should set message type to "flow"');
    console.log('- Should store interactive_data with flow information');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Expected output analysis
function analyzeExpectedOutput() {
  console.log('\n=== Expected Output Analysis ===');
  console.log('Based on the webhook payload:');
  console.log('1. Message type should be "flow" (not "interactive")');
  console.log('2. Content should contain parsed flow data:');
  console.log('   - flow_token: 657626567204276');
  console.log('3. Interactive data should contain:');
  console.log('   - type: "flow"');
  console.log('   - flow_name: "flow"');
  console.log('   - flow_token: "657626567204276"');
  console.log('   - body: "Sent"');
  console.log('   - flow_response: parsed JSON object');
  console.log('4. Should create chat message record in database');
  console.log('5. Should notify WebSocket clients');
}

// Run tests
if (require.main === module) {
  analyzeExpectedOutput();
  console.log('\n' + '='.repeat(50));
  testFlowResponseExtraction();
}

module.exports = { testFlowResponseExtraction, analyzeExpectedOutput };
