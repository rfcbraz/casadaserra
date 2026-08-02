// src/services/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-PT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function baseTemplate(content) {
  return `
  <!DOCTYPE html>
  <html lang="pt">
  <head><meta charset="UTF-8"><style>
    body { font-family: Georgia, serif; background: #f5f0e8; margin: 0; padding: 0; }
    .wrap { max-width: 580px; margin: 40px auto; background: #fdfaf5; border: 1px solid #e8dcc8; }
    .header { background: #2a2118; padding: 32px 40px; }
    .header h1 { font-family: Georgia, serif; color: #e8b87a; margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 2px; }
    .header p { color: rgba(255,255,255,.5); margin: 4px 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
    .body { padding: 40px; }
    .body p { color: #5a4a38; line-height: 1.8; font-size: 15px; }
    .box { background: #f5f0e8; border: 1px solid #e8dcc8; border-radius: 4px; padding: 20px 24px; margin: 24px 0; }
    .box-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8dcc8; font-size: 14px; }
    .box-row:last-child { border-bottom: none; font-weight: bold; font-size: 16px; }
    .box-label { color: #8b7355; }
    .box-value { color: #2a2118; }
    .btn { display: inline-block; background: #c9893a; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 2px; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; margin: 16px 0; }
    .footer { background: #f5f0e8; padding: 20px 40px; border-top: 1px solid #e8dcc8; text-align: center; }
    .footer p { color: #8b7355; font-size: 12px; margin: 4px 0; }
  </style></head>
  <body><div class="wrap">${content}</div></body>
  </html>`;
}

async function sendReservationConfirmation(reservation) {
  const { guest, room } = reservation;
  const nights = reservation.nights;

  const html = baseTemplate(`
    <div class="header">
      <h1>Casa da Serra</h1>
      <p>Confirmação de Reserva</p>
    </div>
    <div class="body">
      <p>Caro/a <strong>${guest.name}</strong>,</p>
      <p>A sua reserva foi recebida com sucesso! Iremos confirmá-la em breve.</p>
      <div class="box">
        <div class="box-row"><span class="box-label">Referência</span><span class="box-value">#${reservation.id.slice(0,8).toUpperCase()}</span></div>
        <div class="box-row"><span class="box-label">Quarto</span><span class="box-value">${room.name}</span></div>
        <div class="box-row"><span class="box-label">Check-in</span><span class="box-value">${formatDate(reservation.checkIn)}</span></div>
        <div class="box-row"><span class="box-label">Check-out</span><span class="box-value">${formatDate(reservation.checkOut)}</span></div>
        <div class="box-row"><span class="box-label">Noites</span><span class="box-value">${nights}</span></div>
        <div class="box-row"><span class="box-label">Hóspedes</span><span class="box-value">${reservation.guests}</span></div>
        <div class="box-row"><span class="box-label">Total</span><span class="box-value">€${reservation.totalPrice.toFixed(2)}</span></div>
      </div>
      <p>Entraremos em contacto para confirmar a disponibilidade e processar o pagamento.</p>
      <p>Para qualquer dúvida, contacte-nos:</p>
      <p>📞 +351 960 000 000 &nbsp;|&nbsp; ✉ reservas@casadaserra.pt</p>
    </div>
    <div class="footer">
      <p>Casa da Serra · Serra da Estrela, Portugal</p>
      <p>© 2026 Casa da Serra. Todos os direitos reservados.</p>
    </div>
  `);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: guest.email,
    subject: `Reserva recebida — Casa da Serra #${reservation.id.slice(0,8).toUpperCase()}`,
    html,
  });
}

async function sendReservationStatusUpdate(reservation, newStatus) {
  const { guest, room } = reservation;
  const statusMessages = {
    CONFIRMED: { label: 'Confirmada ✓', msg: 'A sua reserva foi confirmada! Estamos ansiosos por recebê-lo/a.' },
    DECLINED:  { label: 'Recusada',      msg: 'Lamentamos informar que não foi possível confirmar a sua reserva para as datas solicitadas.' },
    CANCELLED: { label: 'Cancelada',     msg: 'A sua reserva foi cancelada. Lamentamos qualquer inconveniente.' },
    PAID:      { label: 'Paga ✓',        msg: 'O pagamento foi processado com sucesso. Tudo pronto!' },
  };
  const info = statusMessages[newStatus] || { label: newStatus, msg: '' };

  const html = baseTemplate(`
    <div class="header">
      <h1>Casa da Serra</h1>
      <p>Atualização de Reserva — ${info.label}</p>
    </div>
    <div class="body">
      <p>Caro/a <strong>${guest.name}</strong>,</p>
      <p>${info.msg}</p>
      <div class="box">
        <div class="box-row"><span class="box-label">Referência</span><span class="box-value">#${reservation.id.slice(0,8).toUpperCase()}</span></div>
        <div class="box-row"><span class="box-label">Quarto</span><span class="box-value">${room.name}</span></div>
        <div class="box-row"><span class="box-label">Check-in</span><span class="box-value">${formatDate(reservation.checkIn)}</span></div>
        <div class="box-row"><span class="box-label">Check-out</span><span class="box-value">${formatDate(reservation.checkOut)}</span></div>
        <div class="box-row"><span class="box-label">Total</span><span class="box-value">€${reservation.totalPrice.toFixed(2)}</span></div>
      </div>
    </div>
    <div class="footer">
      <p>Casa da Serra · Serra da Estrela, Portugal</p>
    </div>
  `);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: guest.email,
    subject: `Reserva ${info.label} — Casa da Serra`,
    html,
  });
}

async function sendAdminNotification(reservation) {
  const { guest, room } = reservation;

  const html = baseTemplate(`
    <div class="header">
      <h1>Casa da Serra</h1>
      <p>Nova Reserva Recebida</p>
    </div>
    <div class="body">
      <p>Foi recebida uma nova reserva que necessita de confirmação.</p>
      <div class="box">
        <div class="box-row"><span class="box-label">Referência</span><span class="box-value">#${reservation.id.slice(0,8).toUpperCase()}</span></div>
        <div class="box-row"><span class="box-label">Hóspede</span><span class="box-value">${guest.name}</span></div>
        <div class="box-row"><span class="box-label">Email</span><span class="box-value">${guest.email}</span></div>
        <div class="box-row"><span class="box-label">Telefone</span><span class="box-value">${guest.phone || '—'}</span></div>
        <div class="box-row"><span class="box-label">Quarto</span><span class="box-value">${room.name}</span></div>
        <div class="box-row"><span class="box-label">Check-in</span><span class="box-value">${formatDate(reservation.checkIn)}</span></div>
        <div class="box-row"><span class="box-label">Check-out</span><span class="box-value">${formatDate(reservation.checkOut)}</span></div>
        <div class="box-row"><span class="box-label">Hóspedes</span><span class="box-value">${reservation.guests}</span></div>
        <div class="box-row"><span class="box-label">Total</span><span class="box-value">€${reservation.totalPrice.toFixed(2)}</span></div>
        ${reservation.specialRequests ? `<div class="box-row"><span class="box-label">Pedidos especiais</span><span class="box-value">${reservation.specialRequests}</span></div>` : ''}
      </div>
      <a href="${process.env.FRONTEND_URL}/admin" class="btn">Ver no Painel</a>
    </div>
    <div class="footer"><p>Casa da Serra · Painel de Gestão</p></div>
  `);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `🔔 Nova reserva: ${guest.name} — ${room.name}`,
    html,
  });
}

module.exports = {
  sendReservationConfirmation,
  sendReservationStatusUpdate,
  sendAdminNotification,
};
