async function get_user(ctx) {
  try {
    // Получаем информацию о группе
    const chatId = ctx.chat.id;

    // Получаем список администраторов
    const admins = await ctx.telegram.getChatAdministrators(chatId);

    // Выводим информацию
    let message = 'Список администраторов:\n\n';
    admins.forEach(admin => {
      message += `ID: ${admin.user.id}, Имя: ${admin.user.username || 'Не указано'}, Админ: Да\n`;
    });

    await ctx.reply(message);
  } catch (error) {
    console.error('Ошибка при получении списка администраторов:', error);
    await ctx.reply('❗ Ошибка при получении списка администраторов.');
  }
}

module.exports = {
  get_user
};