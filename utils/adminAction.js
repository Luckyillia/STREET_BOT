const { Markup } = require('telegraf');
const fs = require('fs');
const func = require('./func');

async function adminAction(ctx, adminState) {
  if (!(await func.isAdmin(ctx, ctx.chat.id))) {
    return ctx.reply('🚫 У вас нет доступа к админ-панели.');
  }

  adminState.set(ctx.from.id, 'admin_menu');
  await ctx.reply(
    '🔧 Админ панель. Выберите действие:',
    Markup.keyboard([['➕ Добавить улицу', '🗑 Удалить улицу'], ['🔙 Вернуться в главное меню']]).resize()
  );
}

async function addStreet(ctx, adminState) {
  if (!(await func.isAdmin(ctx, ctx.chat.id))) return;

  adminState.set(ctx.from.id, 'adding_street');
  await ctx.reply(
    '✍ Введите название улицы, которую хотите добавить:',
    Markup.keyboard([['🔙 Вернуться в главное меню']]).resize()
  );
}

async function deleteStreet(ctx, adminState) {
  if (!(await func.isAdmin(ctx, ctx.chat.id))) return;

  adminState.set(ctx.from.id, 'removing_street');
  await ctx.reply(
    '✍ Введите название улицы, которую хотите удалить:',
    Markup.keyboard([['🔙 Вернуться в главное меню']]).resize()
  );
}

async function muteUser(ctx) {
  try {
    const data = await fs.promises.readFile('data.json', 'utf8');
    const chats = JSON.parse(data);
    const chatData = chats[ctx.chat.id];

    if (!chatData || !(await func.isAdmin(ctx, ctx.chat.id))) {
      return ctx.reply('🚫 У вас нет прав для выполнения этой команды.');
    }

    const targetUser = ctx.message.reply_to_message?.from;
    if (chatData.admins.some(admin => admin.id === targetUser.id)) {
      return ctx.reply('⚠ Вы не можете замутить администратора.');
    }

    if (chatData.bannedUsers.includes(targetUser.id)) {
      return ctx.reply('🚫 Этот пользователь уже в муте.');
    }

    chatData.bannedUsers.push(targetUser.id);
    await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
    return ctx.reply(`✅ Пользователь ${targetUser.first_name} был замучен.`);
  } catch (error) {
    console.error('Ошибка при муте пользователя:', error);
    ctx.reply('❗ Произошла ошибка.');
  }
}

async function unmuteUser(ctx) {
  try {
    const data = await fs.promises.readFile('data.json', 'utf8');
    const chats = JSON.parse(data);
    const chatData = chats[ctx.chat.id];

    if (!chatData || !(await func.isAdmin(ctx, ctx.chat.id))) {
      return ctx.reply('🚫 У вас нет прав.');
    }

    const targetUser = ctx.message.reply_to_message?.from;

    if (chatData.bannedUsers.includes(targetUser.id)) {
      chatData.bannedUsers = chatData.bannedUsers.filter(id => id !== targetUser.id);
      await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
      return ctx.reply(`🔊 Пользователь ${targetUser.first_name} был размучен.`);
    } 
      return ctx.reply('⚠ Этот пользователь не в муте.');
    
  } catch (error) {
    console.error('Ошибка при размуте пользователя:', error);
    ctx.reply('❗ Произошла ошибка.');
  }
}

async function showBannedUsers(ctx) {
  try {
    const data = await fs.promises.readFile('data.json', 'utf8');
    const chats = JSON.parse(data);
    const chatData = chats[ctx.chat.id];

    if (!chatData || !(await func.isAdmin(ctx, ctx.chat.id))) {
      return ctx.reply('🚫 У вас нет прав для выполнения этой команды.');
    }

    if (chatData.bannedUsers.length === 0) {
      return ctx.reply('⚠ В этом чате нет замученных пользователей.');
    }

    let bannedList = 'Список замученных пользователей:\n';
    chatData.bannedUsers.forEach(userId => {
      bannedList += `• ID: ${userId}\n`;
    });

    return ctx.reply(bannedList);
  } catch (error) {
    console.error('Ошибка при выводе списка замученных пользователей:', error);
    ctx.reply('❗ Произошла ошибка.');
  }
}

async function addStreetFromChat(ctx){
  const text = ctx.message.text.trim();

  // Проверка команды /add-street chat-id street-name
  const regex = /^\/addStreet (-?\d+) (.+)$/;
  const match = text.match(regex);

  if (match) {
    const chatId = match[1];
    const streetName = match[2];

    // Проверяем, является ли пользователь администратором в этом чате
    const isAdminInChat = await func.isAdmin(ctx, chatId);
    if (!isAdminInChat) {
      return ctx.reply('🚫 У вас нет прав администратора в этом чате.');
    }

    try {
      // Чтение данных из файла
      const data = await fs.promises.readFile('data.json', 'utf8');
      const chats = JSON.parse(data);

      if (!chats[chatId]) {
        return ctx.reply('⚠ Чат с таким ID не найден.');
      }

      const chat = chats[chatId];
      if (!Array.isArray(chat.streets)) {
        chat.streets = [];
      }

      // Добавляем улицу в список
      chat.streets.push({
        name: streetName,
        status: 'open',
        dateClosed: null,
        note: null
      });

      // Сохраняем данные обратно в файл
      await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
      return ctx.reply(`✅ Улица "${streetName}" была добавлена в чат ${chat.chatName}.`);
    } catch (error) {
      console.error('Ошибка при добавлении улицы:', error);
      ctx.reply('❗ Произошла ошибка при добавлении улицы.');
    }
  } else {
    ctx.reply('❌ Неверный формат команды. Используйте: /addStreet chat-id street-name');
  }
}


async function removeStreetFromChat(ctx) {
  const text = ctx.message.text.trim();

  // Проверка команды /removeStreet chat-id street-name
  const regex = /^\/removeStreet (-?\d+) (.+)$/;
  const match = text.match(regex);

  if (match) {
    const chatId = match[1]; // ID чата (может быть отрицательным)
    const streetName = match[2]; // Название улицы

    // Проверяем, является ли пользователь администратором в этом чате
    const isAdminInChat = await func.isAdmin(ctx, chatId);
    if (!isAdminInChat) {
      return ctx.reply('🚫 У вас нет прав администратора в этом чате.');
    }

    try {
      // Чтение данных из файла
      const data = await fs.promises.readFile('data.json', 'utf8');
      const chats = JSON.parse(data);

      if (!chats[chatId]) {
        return ctx.reply('⚠ Чат с таким ID не найден.');
      }

      const chat = chats[chatId];
      if (!Array.isArray(chat.streets)) {
        return ctx.reply('⚠ В этом чате нет списка улиц.');
      }

      // Ищем улицу для удаления
      const streetIndex = chat.streets.findIndex(street => street.name === streetName);
      if (streetIndex === -1) {
        return ctx.reply(`⚠ Улица "${streetName}" не найдена в чате.`);
      }

      // Удаляем улицу из списка
      chat.streets.splice(streetIndex, 1);

      // Сохраняем данные обратно в файл
      await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
      return ctx.reply(`✅ Улица "${streetName}" была удалена из чата ${chat.chatName}.`);
    } catch (error) {
      console.error('Ошибка при удалении улицы:', error);
      ctx.reply('❗ Произошла ошибка при удалении улицы.');
    }
  } else {
    ctx.reply('❌ Неверный формат команды. Используйте: /removeStreet chat-id street-name');
  }
}


module.exports = {
  adminAction,
  addStreet,
  deleteStreet,
  muteUser,
  unmuteUser,
  showBannedUsers,
  addStreetFromChat,
  removeStreetFromChat
};
