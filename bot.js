const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const { getWindDirection } = require('./func.js')

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('HI!\nI am a bot that can show the weather in a specified city. Just send me a city name!'));

bot.on('text', async (ctx) => {
    const city = ctx.message.text;
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=770ab17f8002c6957bbf7d95c802acf8&units=metric`);
        if (!response.ok) throw new Error('City not found');
        const data = await response.json();
        
        const name = data.name;
        const temp = data.main.temp;
        const feel_like = data.main.feels_like;
        const min = data.main.temp_min;
        const max = data.main.temp_max;
        const humi = data.main.humidity;
        const desc = data.weather[0].description;
        const main = data.weather[0].main;
        const wind_speed = data.wind.speed;
        const sunrise = new Date(data.sys.sunrise* 1000).toLocaleTimeString();
        const sunset = new Date(data.sys.sunset* 1000).toLocaleTimeString();
        const wind_direction = getWindDirection(data.wind.deg);

        ctx.reply(`🌤 **Weather in ${name}** 🌤\n\n` +
            `☁️ **Weather**: ${main}\n` +
            `🔍 **Description**: ${desc}\n\n` +
            `🌡️ **Temperature**: ${temp}°C\n` +
            `🌡️ **Feels Like**: ${feel_like}°C\n\n` +
            `🔻 **Min Temperature**: ${min}°C\n` +
            `🔺 **Max Temperature**: ${max}°C\n\n` +
            `💧 **Humidity**: ${humi}%\n\n` +
            `💨 **Wind Speed**: ${wind_speed} m/s\n` +
            `🧭 **Wind Direction**: ${wind_direction}\n\n` +
            `🌅 **Sunrise**: ${sunrise}\n` + 
            `🌇 **Sunset**: ${sunset}`);
    } catch (error) {
        ctx.reply(`❌ Error: ${error.message}`);
    }
});

bot.launch();


process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))