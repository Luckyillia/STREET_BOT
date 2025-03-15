const { Markup } = require('telegraf');
const fs = require('fs').promises;

async function start(ctx) {
  try {
    const chatId = ctx.chat.id; // Получаем ID чата
    const isGroupChat = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';

    let admins = [];
    if (isGroupChat) {
      const adminsData = await ctx.telegram.getChatAdministrators(chatId);
      admins = adminsData.map(admin => admin.user);
    }

    // Chat data structure with required fields
    const chatData = {
      chatName: ctx.chat.title,
      isAdmin: isGroupChat ? admins.some(admin => admin.id === ctx.from.id) : false,
      isGroup: isGroupChat,
      admins: admins,
      bannedUsers: [],
      streets: [] // Initially, no streets data
    };

    // Load existing chat data from file
    let jsonData = {};
    try {
      const fileData = await fs.readFile('data.json', 'utf8');
      jsonData = JSON.parse(fileData);
    } catch (error) {
      console.log('Файл data.json отсутствует или поврежден. Создаем новый.');
    }

    // Check if chat already exists in data
    if (!jsonData[chatId]) {
      jsonData[chatId] = chatData;
    }

    // Save updated chat data
    await fs.writeFile('data.json', JSON.stringify(jsonData, null, 2), 'utf8');

    // Welcome message
    await ctx.reply(
      '🚧 Привет! Я твой помощник по информации о перекрытых улицах. 🛑\n\n' +
      'С моей помощью ты можешь:\n' +
      '- Узнать, какие улицы перекрыты прямо сейчас.\n' +
      '- Проверить статус конкретной улицы.\n' +
      '- Сообщить о перекрытии или открытии улицы.\n\n' +
      'Что ты хочешь сделать? Выбери опцию ниже: ',
      Markup.keyboard([[ '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
    );
  } catch (error) {
    console.error('Ошибка при получении данных чата:', error);
    await ctx.reply('❗ Ошибка при загрузке данных.');
  }
}

// List streets function with chat data
async function listStreet(ctx) {
  try {
    const chatId = ctx.chat.id;
    const data = await fs.readFile('data.json', 'utf8');
    let chats = JSON.parse(data);

    const chatData = chats[chatId];
    if (!chatData || chatData.streets.length === 0) {
      return await ctx.reply(
        '✅ В данный момент нет информации об улицах.',
        Markup.keyboard([['🔙 Вернуться в главное меню']]).resize()
      );
    }

    const streetsList = chatData.streets.map((street, index) => {
      const statusEmoji = street.status === 'closed' ? '❌' : '✅';
      const noteText = street.note ? ` (📝 ${street.note})` : '';
      return `${index + 1}. ${statusEmoji} ${street.name}${noteText}`;
    }).join('\n');

    await ctx.reply(
      `🚧 Статус улиц:\n\n${streetsList}`,
      Markup.keyboard([['🔙 Вернуться в главное меню']]).resize()
    );
  } catch (error) {
    console.error('Ошибка чтения файла:', error);
    await ctx.reply('❗ Ошибка загрузки данных. Попробуйте позже.');
  }
}

// Back to main menu
async function backToMain(ctx, userState) {
  await ctx.reply(
    '🏠 Главное меню. Выберите действие:',
    Markup.keyboard([[ '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
  );
  userState.delete(ctx.from.id);
}

// Check street status state
async function checkState(ctx, userState) {
  await ctx.reply(
    'Пожалуйста, ответьте на это сообщение\n\n' +
    '🔍 Введите название улицы для проверки:',
    Markup.keyboard([['🔙 Вернуться в главное меню']]).resize()
  );
  userState.set(ctx.from.id, 'checking_street');
}

// Edit street status state
async function editState(ctx, userState) {
  await ctx.reply(
    'Пожалуйста, ответьте на это сообщение\n\n' +
    '✍ Введите улицу, новый статус и (при необходимости) примечание в формате:\n\n' +
    '📌 Пример: *Кремлевская-закрыта(ремонт)* или *просп. Победы-открыта*',
    Markup.keyboard([['🔙 Вернуться в главное меню']]).resize()
  );
  userState.set(ctx.from.id, 'changing_status');
}

// Handle dislikes and banning users
async function dislike(ctx) {
  try {
    const data = await fs.readFile('data.json', 'utf8');
    let chats = JSON.parse(data);
    let chatData = chats[ctx.chat.id];

    if (!chatData) return ctx.reply('Ошибка: Чат не найден в базе.');

    let fromUser = ctx.from;
    let targetUser = ctx.message.reply_to_message?.from;

    if (!targetUser) {
      return ctx.reply('⚠ Ответьте на сообщение пользователя, чтобы поставить дизлайк.');
    }

    if (!chatData.dislikes) chatData.dislikes = {};
    if (!chatData.bannedUsers) chatData.bannedUsers = [];

    // Check if user already disliked the target user
    if (chatData.dislikes[targetUser.id]?.includes(fromUser.id)) {
      return ctx.reply('🚫 Вы уже ставили дизлайк этому пользователю.');
    }

    // Add dislike
    if (!chatData.dislikes[targetUser.id]) {
      chatData.dislikes[targetUser.id] = [];
    }
    chatData.dislikes[targetUser.id].push(fromUser.id);

    // Ban user if they have 10 dislikes
    if (chatData.dislikes[targetUser.id].length >= 10) {
      if (!chatData.bannedUsers.some(user => user.id === targetUser.id)) {
        chatData.bannedUsers.push({
          id: targetUser.id,
          is_bot: targetUser.is_bot || false,
          first_name: targetUser.first_name || '',
          username: targetUser.username || ''
        });
        ctx.reply(`🚫 ${targetUser.first_name} был замучен за 10 дизлайков.`);
      }
    }

    await fs.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
    ctx.reply(`👎 ${fromUser.first_name} поставил дизлайк ${targetUser.first_name}.`);
  } catch (error) {
    console.error('Ошибка при обработке дизлайка:', error);
    ctx.reply('❗ Произошла ошибка.');
  }
}

module.exports = {
  start,
  listStreet,
  editState,
  checkState,
  dislike,
  backToMain
};
