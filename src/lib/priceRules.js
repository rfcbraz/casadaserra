// Carrega o que entra no preço de uma estadia: épocas/feriados e promoções ativas

// Aceita 'YYYY-MM-DD' ou Date e devolve a meia-noite UTC desse dia
function utcDay(value) {
  const key = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  return new Date(`${key}T00:00:00Z`);
}

// Regras que tocam em alguma noite da estadia (do check-in até à véspera do check-out)
function overlapping(checkIn, checkOut) {
  return {
    startDate: { lt: utcDay(checkOut) },
    endDate: { gte: utcDay(checkIn) },
  };
}

async function loadPriceRules(prisma, roomId, checkIn, checkOut) {
  return prisma.priceRule.findMany({ where: { roomId, ...overlapping(checkIn, checkOut) } });
}

// Promoções ativas da unidade ou de todas as unidades
async function loadPromotions(prisma, roomId, checkIn, checkOut) {
  return prisma.promotion.findMany({
    where: { isActive: true, OR: [{ roomId }, { roomId: null }], ...overlapping(checkIn, checkOut) },
  });
}

async function loadPricing(prisma, roomId, checkIn, checkOut) {
  const [rules, promotions] = await Promise.all([
    loadPriceRules(prisma, roomId, checkIn, checkOut),
    loadPromotions(prisma, roomId, checkIn, checkOut),
  ]);
  return { rules, promotions };
}

module.exports = { loadPriceRules, loadPromotions, loadPricing };
