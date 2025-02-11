const { Markup } = require('telegraf');
const fs = require('fs');

async function handleMessage(ctx, userState, adminState) {
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    // Загружаем данные
    const data = await fs.promises.readFile('data.json', 'utf8');
    const chats = JSON.parse(data);

    // Ищем текущий чат
    const chatData = chats.find(chat => chat.chatId === chatId);
    if (!chatData) return next();

    // Проверяем, замучен ли пользователь
    if (chatData.bannedUsers.some(user => user.id === userId)) {
      const allowedCommands = [
        '📋 Список перекрытых улиц',
        '🔙 Вернуться в главное меню'
      ];

      if (!allowedCommands.some(cmd => ctx.message.text.startsWith(cmd))) {
        return ctx.reply('🚫 Вы замучены и не можете отправлять сообщения.');
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке на мут:', error);
  }
  try {
    const userId = ctx.from.id;
    const input = ctx.message.text.trim();
    const state = userState.get(userId);
    const admState = adminState.get(userId);

    // Получаем данные чата
    const chatId = ctx.chat.id;
    const data = await fs.promises.readFile('data.json', 'utf8');
    let chats = JSON.parse(data);
    let chatData = chats.find(chat => chat.chatId === chatId);

    if (!chatData) {
      chatData = {
        chatId: chatId,
        isAdmin: false,
        admins: [],
        bannedUsers: [],
        streets: []
      };
      chats.push(chatData); // Если чат не найден, создаем новый
    }

    // Если пользователь проверяет улицу
    if (state === 'checking_street') {
      const street = chatData.streets.find(s => s.name.toLowerCase() === input.toLowerCase());

      if (!street) {
        return await ctx.reply(`⚠ Улица *${input}* не найдена в базе.`);
      }

      const statusEmoji = street.status === 'closed' ? '❌' : '✅';
      const statusText = street.status === 'closed' ? 'закрыта' : 'открыта';
      const dateClosedText = street.status === 'closed' && street.dateClosed ? `\n📅 Закрыта: ${street.dateClosed}` : '';

      await ctx.reply(`🚧 Статус улицы *${street.name}*:\n\n${statusEmoji} Улица *${statusText}*${dateClosedText}`);
      userState.delete(userId); // Сбрасываем состояние
      return await ctx.reply(
        '🏠 Главное меню. Выберите действие:',
        Markup.keyboard([['📍 Проверить улицу', '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
      );
    }

    // Изменение статуса улицы
    if (state === 'changing_status') {
      const match = input.match(/(.+)-(закрыта|открыта)/i);

      if (!match) {
        return await ctx.reply('⚠ Ошибка! Введите данные в правильном формате: *ул. Ленина-закрыта*');
      }

      const streetName = match[1].trim();
      const newStatus = match[2].toLowerCase() === 'закрыта' ? 'closed' : 'open';

      let streetFound = false;
      chatData.streets = chatData.streets.map((street) => {
        if (street.name.toLowerCase() === streetName.toLowerCase()) {
          street.status = newStatus;
          if (newStatus === 'closed') {
            street.dateClosed = new Date().toLocaleString();
          } else {
            street.dateClosed = null;
          }
          streetFound = true;
        }
        return street;
      });

      if (!streetFound) {
        return await ctx.reply('❌ Улица не найдена. Проверьте правильность написания.');
      }

      await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');
      await ctx.reply(`✅ Статус улицы *${streetName}* изменён на *${newStatus === 'closed' ? 'закрыта' : 'открыта'}*!`);
      userState.delete(userId);
      return await ctx.reply(
        '🏠 Главное меню. Выберите действие:',
        Markup.keyboard([['📍 Проверить улицу', '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
      );
    }

    // Добавление новой улицы
    if (admState === 'adding_street') {
      const streetName = input;

      // Проверяем, есть ли уже такая улица
      const existingStreet = chatData.streets.find(s => s.name.toLowerCase() === streetName.toLowerCase());
      if (existingStreet) {
        return await ctx.reply('⚠ Улица уже существует в базе.');
      }

      chatData.streets.push({ name: streetName, status: 'open' });
      await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');

      await ctx.reply(`✅ Улица *${streetName}* успешно добавлена в базу!`);
      adminState.delete(userId); // Возвращаем в меню
      return await ctx.reply(
        '🏠 Главное меню. Выберите действие:',
        Markup.keyboard([['📍 Проверить улицу', '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
      );
    }

    // Удаление улицы
    if (admState === 'removing_street') {
      const streetName = input;

      const streetIndex = chatData.streets.findIndex(s => s.name.toLowerCase() === streetName.toLowerCase());
      if (streetIndex === -1) {
        return await ctx.reply('⚠ Улица не найдена в базе.');
      }

      chatData.streets.splice(streetIndex, 1);
      await fs.promises.writeFile('data.json', JSON.stringify(chats, null, 2), 'utf8');

      await ctx.reply(`✅ Улица *${streetName}* успешно удалена из базы!`);
      adminState.delete(userId); // Возвращаем в меню
      return await ctx.reply(
        '🏠 Главное меню. Выберите действие:',
        Markup.keyboard([['📍 Проверить улицу', '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
      );
    }
  } catch (error) {
    console.error('Ошибка в обработке сообщения:', error);
    await ctx.reply('❗ Произошла ошибка при обработке вашего запроса. Попробуйте позже.');
  }
}

module.exports = {
  handleMessage
};