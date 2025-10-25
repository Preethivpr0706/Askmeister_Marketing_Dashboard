const axios = require('axios');

// Test webhook payload with flow response
const webhookPayload = {
  "object": "whatsapp_business_account",
  "entry": [
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
  ]
};

async function testWebhook() {
  try {
    console.log('Testing webhook with flow response payload...');
    console.log('Payload:', JSON.stringify(webhookPayload, null, 2));

    const response = await axios.post('http://localhost:5000/api/messages/webhook', webhookPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Webhook response:', response.status, response.data);
  } catch (error) {
    console.error('Error testing webhook:', error.response?.data || error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testWebhook();
}

module.exports = { testWebhook };
