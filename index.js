const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const config = require('./config');

// Initialize Telegram bot
const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });

// Premiumy API headers
const premiumyHeaders = {
    'Authorization': `Bearer ${config.PREMIUMY_API_KEY}`
};

// Function to fetch all numbers
async function fetchNumbers() {
    try {
        const response = await axios.get(`${config.PREMIUMY_API_BASE_URL}/numbers`, {
            headers: premiumyHeaders
        });
        return response.data || [];
    } catch (error) {
        console.error('Error fetching numbers:', error.message);
        return [];
    }
}

// Function to fetch messages for a number
async function fetchMessages(numberId) {
    try {
        const response = await axios.get(`${config.PREMIUMY_API_BASE_URL}/messages?number_id=${numberId}`, {
            headers: premiumyHeaders
        });
        return response.data || [];
    } catch (error) {
        console.error(`Error fetching messages for number ${numberId}:`, error.message);
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

// Main function to check for OTPs
async function checkForOTPs() {
    try {
        const numbers = await fetchNumbers();
        console.log('Fetched numbers:', numbers); // Debug log
        
        for (const number of numbers) {
            if (!number || !number.id) {
                console.log('Invalid number object:', number);
                continue;
            }

            const messages = await fetchMessages(number.id);
            console.log(`Fetched messages for number ${number.id}:`, messages); // Debug log
            
            for (const msg of messages) {
                if (!msg || !msg.message) {
                    console.log('Invalid message object:', msg);
                    continue;
                }

                const messageText = msg.message.toString().toLowerCase();
                if (messageText.includes('otp')) {
                    const otp = extractOTP(msg.message);
                    if (otp) {
                        const messageText = `
🔐 <b>New OTP Received</b>

📱 Number: ${number.phone_number || 'Unknown'}
📨 Service: ${msg.sender || 'Unknown'}
🔑 OTP: ${otp}
⏰ Time: ${new Date(msg.created_at || Date.now()).toLocaleString()}
`;
                        await sendToTelegramGroup(messageText);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in checkForOTPs:', error.message);
        // Log the full error for debugging
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
        bot.sendMessage(chatId, 'No numbers found.');
        return;
    }

    let message = '📱 <b>Your Numbers:</b>\n\n';
    numbers.forEach(number => {
        if (number && number.phone_number) {
            message += `Number: ${number.phone_number}\nStatus: ${number.status || 'Unknown'}\n\n`;
        }
    });

    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

// Start checking for OTPs every 30 seconds
setInterval(checkForOTPs, 30000);

// Initial check
checkForOTPs();

console.log('Bot is running...'); 