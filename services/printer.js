const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');

const PRINTER_IP   = process.env.PRINTER_IP;
const PRINTER_PORT = process.env.PRINTER_PORT || 9100;

const printOrder = async (order) => {
  if (!PRINTER_IP) return;

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${PRINTER_IP}:${PRINTER_PORT}`,
    options: { timeout: 4000 },
    width: 48,
    characterSet: CharacterSet.PC857_TURKISH,
    removeSpecialCharacters: false,
  });

  try {
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println("HER SEY EGE'DEN");
    printer.setTextNormal();
    printer.bold(false);
    printer.println('Kahvalti & Meze');
    printer.drawLine();

    printer.alignLeft();
    printer.println(`Masa : ${order.table_number}        #${order.id}`);
    printer.println(new Date().toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }));
    printer.drawLine();

    for (const item of order.items) {
      const name = (item.name_override || item.name || '').substring(0, 30);
      const qty  = `${item.quantity}x`;
      printer.leftRight(qty + ' ' + name, `${(item.price_at_purchase * item.quantity).toFixed(2)}TL`);
    }

    printer.drawLine();
    printer.bold(true);
    printer.leftRight('TOPLAM', `${parseFloat(order.total_price).toFixed(2)} TL`);
    printer.bold(false);

    if (order.customer_note) {
      printer.drawLine();
      printer.bold(true);
      printer.println('NOT: ' + order.customer_note);
      printer.bold(false);
    }

    printer.newLine();
    printer.alignCenter();
    printer.println('Afiyet olsun!');
    printer.newLine();
    printer.cut();

    await printer.execute();
    console.log(`[Printer] Order #${order.id} printed.`);
  } catch (err) {
    console.error('[Printer] Error:', err.message);
  }
};

module.exports = { printOrder };