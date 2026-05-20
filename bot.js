'use strict';
// bot.js — Techofy Cloud Telegram Bot

const TelegramBot = require('node-telegram-bot-api');

// Sessions for multi-step admin commands: Map<chatId, sessionData>
const sessions = new Map();

/**
 * @param {object} opts
 * @param {string} opts.token — Bot token from @BotFather
 * @param {string} opts.adminChatId — Admin chat/group ID that receives order notifications
 * @param {object} opts.mailer — Nodemailer transporter
 * @param {object} opts.templates — Email template functions
 * @param {object} opts.models — { User, Order, Visitor }
 * @param {string} opts.fromEmail
 */
function createBot({ token, adminChatId, mailer, templates, models, fromEmail }) {
  const bot = new TelegramBot(token, { polling: true });
  const { User, Order, Visitor } = models;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isAdmin = (chatId) => String(chatId) === String(adminChatId);

  const reply = (chatId, text, extra = {}) =>
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...extra });

  const clearSession = (chatId) => sessions.delete(chatId);

  const setSession = (chatId, data) =>
    sessions.set(chatId, { ...sessions.get(chatId), ...data });

  const getSession = (chatId) => sessions.get(chatId) || {};

  // ── /start ───────────────────────────────────────────────────────────────────
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (isAdmin(chatId)) {
      reply(chatId,
        `👋 *Techofy Cloud Admin Bot*\n\n` +
        `Available commands:\n` +
        `• /stats — View dashboard stats\n` +
        `• /send — Send server credentials to a user\n` +
        `• /payment — Send payment details to a user\n` +
        `• /cancel — Cancel current operation`
      );
    } else {
      reply(chatId,
        `⚡ *Techofy Cloud*\n\nWelcome! Visit [techofy](https://techofy.xyz) to order your VPS or RDP server.`
      );
    }
  });

  // ── /cancel ──────────────────────────────────────────────────────────────────
  bot.onText(/\/cancel/, (msg) => {
    clearSession(msg.chat.id);
    reply(msg.chat.id, '✅ Operation cancelled.');
  });

  // ── /stats ───────────────────────────────────────────────────────────────────
  bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(chatId)) return reply(chatId, '❌ Admin only.');
    try {
      const [totalVisitors, totalUsers, verifiedUsers, totalOrders,
             rdpOrders, vpsOrders, pendingOrders, activeOrders] = await Promise.all([
        Visitor.countDocuments(),
        User.countDocuments(),
        User.countDocuments({ emailVerified: true }),
        Order.countDocuments(),
        Order.countDocuments({ planType: { $in: ['RDP'] } }),
        Order.countDocuments({ planType: { $in: ['VPS'] } }),
        Order.countDocuments({ status: 'pending' }),
        Order.countDocuments({ status: 'active' }),
      ]);
      reply(chatId,
        `*Techofy Cloud — Live Stats*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `*Total Visitors:* ${totalVisitors.toLocaleString()}\n` +
        `*Total Users (registered):* ${totalUsers.toLocaleString()}\n` +
        `*Email Verified Users:* ${verifiedUsers.toLocaleString()}\n\n` +
        `*Total Orders:* ${totalOrders.toLocaleString()}\n` +
        `*VPS Orders:* ${vpsOrders.toLocaleString()}\n` +
        `*RDP Orders:* ${rdpOrders.toLocaleString()}\n\n` +
        `*Pending:* ${pendingOrders.toLocaleString()}\n` +
        `*Active Servers:* ${activeOrders.toLocaleString()}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `_Updated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST_`
      );
    } catch (err) {
      reply(chatId, `❌ Error fetching stats: ${err.message}`);
    }
  });

  // ── /send ─────────────────────────────────────────────────────────────────────
  // Flow: /send → email? → list orders → pick # → IP? → username? → password? → send email
  bot.onText(/\/send$/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(chatId)) return reply(chatId, '❌ Admin only.');
    clearSession(chatId);
    setSession(chatId, { cmd: 'send', step: 'awaiting_email' });
    reply(chatId, '📧 Enter the *email address* of the user to send credentials to:');
  });

  // ── /payment ──────────────────────────────────────────────────────────────────
  // Flow: /payment → email? → confirm user → amount? → send payment email
  bot.onText(/\/payment$/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(chatId)) return reply(chatId, '❌ Admin only.');
    clearSession(chatId);
    setSession(chatId, { cmd: 'payment', step: 'awaiting_email' });
    reply(chatId, '📧 Enter the *email address* to send payment details to:');
  });

  // ── General message handler (handles conversation steps) ────────────────────
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();

    // Ignore commands
    if (text.startsWith('/')) return;
    if (!isAdmin(chatId)) return;

    const session = getSession(chatId);
    if (!session.cmd) return; // No active session

    try {
      // ── /send conversation ─────────────────────────────────────────────────
      if (session.cmd === 'send') {
        switch (session.step) {

          case 'awaiting_email': {
            const email = text.toLowerCase();
            const user = await User.findOne({ email });
            if (!user) {
              return reply(chatId, `❌ No user found with email: \`${email}\`\nTry again or /cancel`);
            }
            const orders = await Order.find({ userEmail: email }).sort({ createdAt: -1 });
            if (!orders.length) {
              return reply(chatId, `❌ No orders found for: \`${email}\`\nTry again or /cancel`);
            }
            setSession(chatId, {
              step: orders.length === 1 ? 'awaiting_ip' : 'awaiting_order_select',
              email,
              user,
              orders,
              selectedOrder: orders.length === 1 ? orders[0] : null,
            });
            if (orders.length === 1) {
              const o = orders[0];
              reply(chatId,
                `✅ Found 1 order for *${user.firstName} ${user.lastName}*:\n` +
                `• *${o.orderId}* — ${o.planType} ${o.planName} (${o.planRam}) — Status: \`${o.status}\`\n\n` +
                `Now enter the *IP Address* for this server:`
              );
            } else {
              const list = orders.map((o, i) =>
                `${i + 1}. \`${o.orderId}\` — ${o.planType} ${o.planName} (${o.planRam}) — \`${o.status}\``
              ).join('\n');
              reply(chatId,
                `📋 *${orders.length} orders* found for \`${email}\`:\n\n${list}\n\n` +
                `Reply with the *number* of the order you want to send credentials for:`
              );
            }
            break;
          }

          case 'awaiting_order_select': {
            const idx = parseInt(text, 10) - 1;
            const orders = session.orders;
            if (isNaN(idx) || idx < 0 || idx >= orders.length) {
              return reply(chatId, `❌ Please enter a valid number between 1 and ${orders.length}.`);
            }
            setSession(chatId, { step: 'awaiting_ip', selectedOrder: orders[idx] });
            const o = orders[idx];
            reply(chatId,
              `✅ Selected: \`${o.orderId}\` — ${o.planType} ${o.planName}\n\n` +
              `Enter the *IP Address* for this server:`
            );
            break;
          }

          case 'awaiting_ip': {
            setSession(chatId, { step: 'awaiting_username', ip: text });
            reply(chatId, `✅ IP: \`${text}\`\n\nNow enter the *Username*:`);
            break;
          }

          case 'awaiting_username': {
            setSession(chatId, { step: 'awaiting_password', username: text });
            reply(chatId, `✅ Username: \`${text}\`\n\nNow enter the *Password*:`);
            break;
          }

          case 'awaiting_password': {
            const { email, user, selectedOrder, ip, username } = session;
            const password = text;
            clearSession(chatId);

            // Send credentials email
            const html = templates.credentialsEmail({
              firstName: user.firstName,
              lastName: user.lastName,
              orderId: selectedOrder.orderId,
              planType: selectedOrder.planType,
              planName: selectedOrder.planName,
              planRam: selectedOrder.planRam,
              ip,
              username,
              password,
            });
            await mailer.sendMail({
              from: fromEmail,
              to: email,
              subject: `✅ Your ${selectedOrder.planType} Server is Ready — ${selectedOrder.orderId}`,
              html,
            });

            // Update order status in DB
            await Order.findByIdAndUpdate(selectedOrder._id, {
              status: 'active',
              'credentials.ip': ip,
              'credentials.username': username,
              $push: { statusHistory: { status: 'active', note: `Credentials delivered by admin` } },
              updatedAt: new Date(),
            });

            reply(chatId,
              `✅ *Credentials sent!*\n\n` +
              `📧 Email: \`${email}\`\n` +
              `🖥️ IP: \`${ip}\`\n` +
              `👤 Username: \`${username}\`\n` +
              `🔑 Password: \`${password}\`\n\n` +
              `Order \`${selectedOrder.orderId}\` marked as *Active*.`
            );
            break;
          }
        }
      }

      // ── /payment conversation ──────────────────────────────────────────────
      if (session.cmd === 'payment') {
        switch (session.step) {

          case 'awaiting_email': {
            const email = text.toLowerCase();
            const user = await User.findOne({ email });
            if (!user) {
              return reply(chatId, `❌ No user found with email: \`${email}\`\nTry again or /cancel`);
            }
            const orders = await Order.find({ userEmail: email, isFree: false }).sort({ createdAt: -1 });
            setSession(chatId, { step: 'awaiting_amount', email, user, orders });
            const orderList = orders.length
              ? orders.map(o => `• \`${o.orderId}\` — ${o.planType} ${o.planName} (${o.planPrice})`).join('\n')
              : '_No paid orders found_';
            reply(chatId,
              `👤 *User:* ${user.firstName} ${user.lastName} (\`${email}\`)\n\n` +
              `📋 *Their paid plan requests:*\n${orderList}\n\n` +
              `Enter the *amount to charge* (e.g. \`$10\`, \`$15/mo\`):`
            );
            break;
          }

          case 'awaiting_amount': {
            const { email, user, orders } = session;
            const amount = text;
            const latestOrder = orders[0] || {};
            clearSession(chatId);

            const html = templates.paymentEmail({
              firstName: user.firstName,
              lastName: user.lastName,
              orderId: latestOrder.orderId || 'N/A',
              planName: latestOrder.planName || 'Requested Plan',
              planType: latestOrder.planType || '',
              planPrice: latestOrder.planPrice || '',
              amount,
            });
            await mailer.sendMail({
              from: fromEmail,
              to: email,
              subject: `💳 Payment Details — Techofy Cloud (${amount})`,
              html,
            });

            reply(chatId,
              `✅ *Payment details sent!*\n\n` +
              `📧 Sent to: \`${email}\`\n` +
              `💰 Amount: \`${amount}\`\n\n` +
              `The user will receive all payment addresses and instructions via email.`
            );
            break;
          }
        }
      }
    } catch (err) {
      console.error('Bot handler error:', err);
      clearSession(chatId);
      reply(chatId, `❌ Something went wrong: ${err.message}\nOperation cancelled.`);
    }
  });

  // ── Public method: send new order notification to admin ──────────────────────
  bot.notifyNewOrder = async function (order, screenshotPath = null) {
    const isFree = order.isFree;
    const msg =
      `🆕 *New ${isFree ? 'FREE' : 'PAID'} Order!*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 Order ID: \`${order.orderId}\`\n` +
      `📦 Plan: ${order.planType} ${order.planName} (${order.planRam})\n` +
      `💰 Price: ${order.planPrice || 'Free'}\n\n` +
      `👤 Name: ${order.firstName} ${order.lastName}\n` +
      `📧 Email: \`${order.userEmail}\`\n\n` +
      `📅 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\n` +
      (isFree ? `📸 Screenshot: Attached below\n` : `💳 Status: Awaiting Payment\n`) +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Reply /send to deliver credentials or /payment to send payment details.`;

    try {
      await bot.sendMessage(adminChatId, msg, { parse_mode: 'Markdown' });
      // Send screenshot for free orders
      if (isFree && screenshotPath) {
        await bot.sendPhoto(adminChatId, screenshotPath, {
          caption: `📸 YT Subscribe Proof — Order \`${order.orderId}\``,
          parse_mode: 'Markdown',
        });
      }
    } catch (err) {
      console.error('Telegram notify error:', err.message);
    }
  };

  console.log('✅ Telegram bot started.');
  return bot;
}

module.exports = { createBot };
