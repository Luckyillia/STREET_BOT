const { Markup } = require('telegraf');
const fs = require('fs');
const func = require('./func');

async function adminAction(ctx, adminState) {
  if (!(await func.isAdmin(ctx))) {
    return ctx.reply('🚫 У вас нет доступа к админ-панели.');
  }

  adminState.set(ctx.from.id, 'admin_menu');
  await ctx.reply(
    '🔧 Админ панель. Выберите действие:',
    Markup.keyboard([['➕ Добавить улицу', '🗑 Удалить улицу'], ['🔙 Вернуться в главное меню']]).resize()
  );
}

async function addStreet(ctx, adminState) {
  if (!(await func.isAdmin(ctx))) return;

  adminState.set(ctx.from.id, 'adding_street');
  await ctx.reply(
    '✍ Введите название улицы, которую хотите добавить:',
    Markup.keyboard([['🔙 Вернуться в главное меню']]).resize()
  );
}

async function deleteStreet(ctx, adminState) {
  if (!(await func.isAdmin(ctx))) return;

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
    const chatData = chats.find(chat => chat.chatId === ctx.chat.id);

    if (!chatData || !(await func.isAdmin(ctx))) {
      return ctx.reply('🚫 У вас нет прав для выполнения этой команды.');
    }

    let targetUser = ctx.message.reply_to_message?.from;
    console.log(targetUser);
    // Проверка на администратора
    if (chatData.admins.some(admin => admin.id === targetUser.id)) {
      return ctx.reply('⚠ Вы не можете замутить администратора.');
    }

    // Проверяем, не в муте ли уже пользователь
    const isBanned = chatData.bannedUsers.some(user => user.id === targetUser.id);
    if (isBanned) {
      return ctx.reply('🚫 Этот пользователь уже в муте.');
    }

    // Добавляем пользователя в мут
    chatData.bannedUsers.push(targetUser);
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
    const chatData = chats.find(chat => chat.chatId === ctx.chat.id);

    if (!chatData || !(await func.isAdmin(ctx))) {
      return ctx.reply('🚫 У вас нет прав.');
    }

    let targetUser = ctx.message.reply_to_message?.from;


    if (chatData.bannedUsers.some(user => user.id === targetUser.id)) {
      chatData.bannedUsers = chatData.bannedUsers.filter(user => user.id !== targetUser.id);
      await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
      return ctx.reply(`🔊 Пользователь ${targetUser.first_name} был размучен.`);
    } else {
      return ctx.reply('⚠ Этот пользователь не в муте.');
    }
  } catch (error) {
    console.error('Ошибка при размуте пользователя:', error);
    ctx.reply('❗ Произошла ошибка.');
  }
}

async function addAdmin(ctx) {
  try {
    const data = await fs.promises.readFile('data.json', 'utf8');
    const chats = JSON.parse(data);
    const chatData = chats.find(chat => chat.chatId === ctx.chat.id);

    if (!chatData || !(await func.isAdmin(ctx))) {
      return ctx.reply('🚫 У вас нет прав.');
    }

    let newAdmin = ctx.message.reply_to_message?.from;
    console.log(newAdmin);
    if (chatData.admins.some(admin => admin.id === newAdmin.id)) {
      return ctx.reply('⚠ Этот пользователь уже администратор.');
    }

    chatData.admins.push(newAdmin);
    await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
    return ctx.reply(`✅ ${newAdmin.first_name} теперь администратор.`);
  } catch (error) {
    console.error('Ошибка при добавлении администратора:', error);
    ctx.reply('❗ Произошла ошибка.');
  }
}

async function removeAdmin(ctx) {
  try {
    const data = await fs.promises.readFile('data.json', 'utf8');
    const chats = JSON.parse(data);
    const chatData = chats.find(chat => chat.chatId === ctx.chat.id);

    if (!chatData || !(await func.isAdmin(ctx))) {
      return ctx.reply('🚫 У вас нет прав.');
    }

    let removeAdmin = ctx.message.reply_to_message?.from;

    chatData.admins = chatData.admins.filter(admin => admin.id !== removeAdmin.id);
    await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
    return ctx.reply(`✅ ${removeAdmin.first_name} больше не администратор.`);
  } catch (error) {
    console.error('Ошибка при удалении администратора:', error);
    ctx.reply('❗ Произошла ошибка.');
  }
}

async function showAdmins(ctx) {
  try {
    const data = await fs.promises.readFile('data.json', 'utf8');
    const chats = JSON.parse(data);
    const chatData = chats.find(chat => chat.chatId === ctx.chat.id);

    if (!chatData || !(await func.isAdmin(ctx))) {
      return ctx.reply('🚫 У вас нет прав для выполнения этой команды.');
    }

    if (chatData.admins.length === 0) {
      return ctx.reply('⚠ В этом чате нет администраторов.');
    }

    let adminList = 'Список администраторов:\n';
    chatData.admins.forEach(admin => {
      adminList += `• ${admin.first_name} (ID: ${admin.id})\n`;
    });

    return ctx.reply(adminList);
  } catch (error) {
    console.error('Ошибка при выводе списка администраторов:', error);
    ctx.reply('❗ Произошла ошибка.');
  }
}

async function showBannedUsers(ctx) {
  try {
    const data = await fs.promises.readFile('data.json', 'utf8');
    const chats = JSON.parse(data);
    const chatData = chats.find(chat => chat.chatId === ctx.chat.id);

    if (!chatData || !(await func.isAdmin(ctx))) {
      return ctx.reply('🚫 У вас нет прав для выполнения этой команды.');
    }

    if (chatData.bannedUsers.length === 0) {
      return ctx.reply('⚠ В этом чате нет замученных пользователей.');
    }

    let bannedList = 'Список замученных пользователей:\n';
    chatData.bannedUsers.forEach(user => {
      bannedList += `• ${user.first_name} = ${user.username} (ID: ${user.id})\n`;
    });

    return ctx.reply(bannedList);
  } catch (error) {
    console.error('Ошибка при выводе списка замученных пользователей:', error);
    ctx.reply('❗ Произошла ошибка.');
  }
}


module.exports = {
  adminAction,
  addStreet,
  deleteStreet,
  muteUser,
  unmuteUser,
  addAdmin,
  removeAdmin,
  showAdmins,
  showBannedUsers
};
