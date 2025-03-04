const { Telegraf } = require('telegraf');
const cron = require('node-cron');

const getUser = require('./utils/get_user');
const userAction = require('./utils/userAction');
const adminAction = require('./utils/adminAction');
const handleMessage = require('./utils/handleMessage');
const func  = require('./utils/func');

const BOT_TOKEN = '7549523279:AAF6edsMZUHYFch0po2TG-tEWhdwX3-pDsg';
const bot = new Telegraf(BOT_TOKEN);

const adminIds = [677128727, 7075398977]; // ID администраторов
const userState = new Map(); // Для отслеживания состояний пользователей
const adminState = new Map(); // Для отслеживания состояний админов


bot.start((ctx) => userAction.start(ctx));

bot.command('admin', (ctx) => adminAction.adminAction(ctx,adminState,adminIds));

bot.command('get_users', (ctx) => getUser.get_user(ctx));

bot.command('mute', (ctx) => adminAction.muteUser(ctx));

bot.command('unmute', (ctx) => adminAction.unmuteUser(ctx));

bot.command('showMuteUser', (ctx) => adminAction.showBannedUsers(ctx));

bot.command('add_admin', (ctx) => adminAction.addAdmin(ctx));

bot.command('remove_admin', (ctx) => adminAction.removeAdmin(ctx));

bot.command('showAdmins', (ctx) => adminAction.showAdmins(ctx));

bot.hears('📋 Список перекрытых улиц', (ctx) => userAction.listStreet(ctx));

bot.hears('🔙 Вернуться в главное меню', (ctx) => userAction.backToMain(ctx, userState));

bot.hears('📍 Проверить улицу', (ctx) => userAction.checkState(ctx,userState));

bot.hears('🚦 Изменить статус улицы', (ctx) => userAction.editState(ctx,userState));

bot.hears('➕ Добавить улицу', (ctx) => adminAction.addStreet(ctx,adminState,adminIds));

bot.hears('🗑 Удалить улицу', (ctx) => adminAction.deleteStreet(ctx,adminState,adminIds));

bot.on('text', (ctx) => handleMessage.handleMessage(ctx,userState,adminState));



cron.schedule('*/15 * * * *', () => {
    console.log('Проверка истекших сроков аренды...');
    func.checkStreetStatus(bot);
});


bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));