const { Markup } = require('telegraf');
const fs = require('fs');

async function start(ctx) {
  try {
    const chatId = ctx.chat.id; // Получаем ID чата

    // Определяем, чат с ботом или группа
    const isGroupChat = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    const isPrivateChat = ctx.chat.type === 'private';

    // Получаем список администраторов только если это группа
    let admins = [];
    if (isGroupChat) {
      const adminsData = await ctx.telegram.getChatAdministrators(chatId);
      admins = adminsData.map(admin => {
        return admin.user;
      });
    }
    // Создаем объект для хранения информации о чате
    const chatData = {
      chatId: chatId,
      chatName: ctx.chat.title,
      isAdmin: isGroupChat ? admins.includes(ctx.from.id) : false, // Проверяем, является ли вызывающий пользователь админом (только для групп)
      isGroup: isGroupChat,
      admins: admins,
      bannedUsers: [], // Пока пустой список
      streets: [] // Пока пустой список улиц
    };

    let jsonData = [];
    try {
      const fileData = fs.readFileSync('data.json', 'utf8');
      jsonData = JSON.parse(fileData); // Парсим JSON
    } catch (error) {
      console.log('Файл data.json отсутствует или поврежден. Создаем новый.');
    }

    const existingChatIndex = jsonData.findIndex(chat => chat.chatId === chatId);

    if (existingChatIndex === -1) {
      jsonData.push(chatData);
    }

    // Записываем обновленный массив обратно в JSON-файл
    fs.writeFileSync('data.json', JSON.stringify(jsonData, null, 2), 'utf8');

    console.log('Данные чата сохранены:', chatData); // Вывод в консоль для проверки

    // Отправляем приветственное сообщение
    await ctx.reply(
      '🚧 Привет! Я твой помощник по информации о перекрытых улицах. 🛑\n\n' +
      'С моей помощью ты можешь:\n' +
      '- Узнать, какие улицы перекрыты прямо сейчас.\n' +
      '- Проверить статус конкретной улицы.\n' +
      '- Сообщить о перекрытии или открытии улицы.\n\n' +
      'Что ты хочешь сделать? Выбери опцию ниже: ',
      Markup.keyboard([['📍 Проверить улицу', '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
    );
  } catch (error) {
    console.error('Ошибка при получении данных чата:', error);
    await ctx.reply('❗ Ошибка при загрузке данных.');
  }
}

async function listStreet(ctx) {
  try {
    const chatId = ctx.chat.id;
    const data = await fs.promises.readFile('data.json', 'utf8');
    let chats = JSON.parse(data);

    const chatData = chats.find(chat => chat.chatId === chatId);

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


async function backToMain(ctx, userState){
  await ctx.reply(
    '🏠 Главное меню. Выберите действие:',
    Markup.keyboard([['📍 Проверить улицу', '📋 Список перекрытых улиц', '🚦 Изменить статус улицы']]).resize()
  );

  userState.delete(ctx.from.id);
}


async function checkState(ctx,userState){
  await ctx.reply(
    'Пожалуйста, ответьте мне на это сообщение\n\n' +
    '🔍 Введите название улицы для проверки:',
    Markup.keyboard([['🔙 Вернуться в главное меню']]).resize()
  );

  userState.set(ctx.from.id, 'checking_street');
}

async function editState(ctx, userState){
  await ctx.reply(
    'Пожалуйста, ответьте мне на это сообщение\n\n' +
    '✍ Введите улицу, новый статус и (при необходимости) примечание в формате:\n\n' +
    '📌 Пример: *Кремлевская-закрыта(ремонт)* или *просп. Победы-открыта*',
    Markup.keyboard([['🔙 Вернуться в главное меню']]).resize()
  );

  userState.set(ctx.from.id, 'changing_status');
}

module.exports = {
  start,
  listStreet,
  editState,
  checkState,
  backToMain
};