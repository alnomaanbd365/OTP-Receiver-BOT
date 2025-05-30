const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const config = require('./config');

// Initialize Telegram bot
const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });

// Premiumy API headers
const premiumyHeaders = {
    'Authorization': `Bearer ${config.PREMIUMY_API_KEY}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

// Function to validate API response
function isValidJsonResponse(response) {
    return response && 
           typeof response === 'object' && 
           !response.toString().includes('<!doctype html>');
}

// Function to fetch all numbers (now fetching allocated SMS numbers)
async function fetchNumbers() {
    try {
        console.log('Fetching allocated SMS numbers with API key:', config.PREMIUMY_API_KEY);
        // Updated endpoint based on documentation
        const response = await axios.get(`${config.PREMIUMY_API_BASE_URL}/sms.funk_number.get_list`, {
            headers: premiumyHeaders,
            validateStatus: function (status) {
                return status >= 200 && status < 500; // Accept all responses for debugging
            }
        });

        console.log('API Response Status:', response.status);
        console.log('API Response Headers:', response.headers);

        if (!isValidJsonResponse(response.data)) {
            console.error('Invalid API response:', response.data);
            throw new Error('Invalid API response format');
        }

        return response.data || [];
    } catch (error) {
        console.error('Error fetching numbers:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
        }
        return [];
    }
}

// Function to fetch messages for a number (now fetching last message by phone number)
async function fetchMessages(phoneNumber) {
    try {
        console.log(`Fetching messages for phone number ${phoneNumber}:`);
        // Updated endpoint and parameter based on documentation
        const response = await axios.get(`${config.PREMIUMY_API_BASE_URL}/sms.mdr_ididget_message_by_phone`, {
            headers: premiumyHeaders,
            params: { phone: phoneNumber }, // Use 'phone' parameter
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            }
        });

        if (!isValidJsonResponse(response.data)) {
            console.error('Invalid API response for messages:', response.data);
            throw new Error('Invalid API response format');
        }

        return response.data || [];
    } catch (error) {
        console.error(`Error fetching messages for phone number ${phoneNumber}:`, error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
        }
        return [];
    }
}

// Function to extract OTP from message
function extractOTP(message) {
    if (!message) return null;
    const otpMatch = message.match(/\d{4,8}/);
    return otpMatch ? otpMatch[0] : null;
}

// Function to send message to Telegram group
async function sendToTelegramGroup(message) {
    try {
        await bot.sendMessage(config.TELEGRAM_GROUP_ID, message, {
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error.message);
    }
}

// Function to check API connection
async function checkApiConnection() {
    try {
        const response = await axios.get(`${config.PREMIUMY_API_BASE_URL}/numbers`, {
            headers: premiumyHeaders,
            validateStatus: function (status) {
                return status >= 200 && status < 500;
            }
        });
        
        console.log('API Connection Test - Status:', response.status);
        console.log('API Connection Test - Headers:', response.headers);
        
        if (!isValidJsonResponse(response.data)) {
            throw new Error('API returned invalid response format');
        }
        
        return true;
    } catch (error) {
        console.error('API Connection Test Failed:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
        }
        return false;
    }
}

// Main function to check for OTPs
async function checkForOTPs() {
    try {
        // First check API connection
        const isConnected = await checkApiConnection();
        if (!isConnected) {
            console.error('API connection failed. Please check your API key and connection.');
            return;
        }

        const numbers = await fetchNumbers(); // This now fetches allocated numbers
        console.log('Fetched allocated numbers:', JSON.stringify(numbers, null, 2));
        
        // Add validation to ensure numbers is an array and contains expected data
        if (!Array.isArray(numbers) || !numbers.every(n => n && n.phone)) {
            console.error('Premiummy API returned invalid data format for allocated numbers:', numbers);
            return;
        }

        for (const number of numbers) {
            const phoneNumber = number.phone; // Use the phone number from the allocated number object

            const messages = await fetchMessages(phoneNumber); // Fetch messages for the phone number
            console.log(`Fetched messages for number ${phoneNumber}:`, JSON.stringify(messages, null, 2));
            
            // Assuming the messages response is an array of message objects
            if (!Array.isArray(messages)) {
                 console.error(`Premiummy API returned invalid data format for messages for ${phoneNumber}:`, messages);
                 continue;
            }

            for (const msg of messages) {
                // Adjust property access based on expected API response for messages
                // Assuming msg is an object with a 'message' property containing the full SMS text
                if (!msg || !msg.message) {
                    console.log(`Invalid message object for ${phoneNumber}:`, msg);
                    continue;
                }

                const messageText = msg.message.toString().toLowerCase();
                if (messageText.includes('otp')) {
                    const otp = extractOTP(msg.message);
                    if (otp) {
                        // Adjust message format based on available data in the 'msg' object
                        // Assuming 'msg' object has properties like 'sender', 'created_at', 'phone_number'
                        const messageText = `
✨ OTP Received ✨

⏰ Time: ${new Date(msg.created_at || Date.now()).toLocaleString()}
📱 Number: ${msg.phone_number || phoneNumber || 'Unknown'}
📨 Service: ${msg.sender || 'Unknown'}
🔑 OTP Code: ${otp}
✉️ Msg: ${msg.message || 'N/A'}
`;
                        await sendToTelegramGroup(messageText);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in checkForOTPs:', error.message);
        console.error('Full error:', error);
    }
}

// Command handlers
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to OTP Receiver Bot! I will forward OTPs to the group.');
});

bot.onText(/\/numbers/, async (msg) => {
    const chatId = msg.chat.id;
    const numbers = await fetchNumbers();
    
    if (!numbers || numbers.length === 0) {
        bot.sendMessage(chatId, 'No numbers found. Please check your API key and connection.');
        return;
    }

    let message = '📱 <b>Your Numbers:</b>\n\n';
    numbers.forEach(number => {
        if (number && number.phone) {
            message += `Number: ${number.phone}\nStatus: ${number.status || 'Unknown'}\n\n`;
        }
    });

    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

// Start checking for OTPs every 30 seconds
setInterval(checkForOTPs, 30000);

// Initial check
checkForOTPs();

console.log('Bot is running...'); 