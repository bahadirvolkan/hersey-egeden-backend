const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'hersey_egeden.db'));

const run = (sql, params = []) => new Promise((res, rej) =>
  db.run(sql, params, function(err) { err ? rej(err) : res(this); })
);
const all = (sql, params = []) => new Promise((res, rej) =>
  db.all(sql, params, (err, rows) => err ? rej(err) : res(rows))
);

const menu = [
  {
    name: 'Meze',
    items: [
      { name: 'Cevizli Havuç Tarator', price: 150 },
      { name: 'Ekşi Elmalı Semiz Otu', price: 150 },
      { name: 'Amerikan Salatası', price: 150 },
      { name: 'Makarna Salatası', price: 150 },
      { name: 'Patates Salatası', price: 150 },
      { name: 'Kısır', price: 150 },
      { name: 'Mercimek Köftesi', price: 150 },
      { name: 'Zeytinyağlı Enginar', price: 100 },
      { name: 'Humus', price: 150 },
      { name: 'Yoğurtlu Köz Patlıcan', price: 150 },
      { name: 'Antep Fıstıklı Girit Ezme', price: 150 },
      { name: 'Pembe Sultan', price: 150 },
      { name: 'Pancar Salatası', price: 150 },
      { name: 'Atom', price: 150 },
      { name: 'Mor Lahana Turşusu', price: 150 },
      { name: 'Şakşuka', price: 150 },
      { name: 'Barbunya Pilaki', price: 150 },
      { name: 'Deniz Börülcesi', price: 150 },
      { name: 'Kadın Budu Köfte', price: 100 },
      { name: 'Acılı Ezme', price: 150 },
      { name: 'Yaprak Sarma', price: 150 },
      { name: 'Kuru Patlıcan Dolması', price: 150 },
      { name: 'Haydari', price: 150 },
      { name: 'Kereviz Salatası', price: 150 },
      { name: "Ege'den Special", price: 150 },
    ]
  },
  {
    name: 'Salata',
    items: [
      { name: 'Tavuklu Salata', price: 250 },
      { name: 'Top Köfteli Salata', price: 300 },
      { name: 'Falafelli Salata', price: 300 },
      { name: 'Cevizli Peynirli Roka Salatası', price: 225 },
      { name: 'Karabuğdaylı Yeşil Salata', price: 200 },
    ]
  },
  {
    name: 'Bowl',
    items: [
      { name: 'Tavuk Bowl', price: 250 },
      { name: 'Köfte Bowl', price: 300 },
      { name: 'Kendin Seç Yeşil Bowl', price: 150 },
      { name: 'Kendin Seç Pilav Bowl', price: 150 },
      { name: 'Sebze Köfteli Bowl', price: 250 },
      { name: "Ege'den Special Bowl", price: 300 },
    ]
  },
  {
    name: 'Makarna',
    items: [
      { name: 'Mantarlı Tavuklu Penne', price: 250 },
      { name: 'Kıymalı Spagetti', price: 250 },
    ]
  },
  {
    name: 'Kahvaltı',
    items: [
      { name: 'İki Kişilik Anne Kahvaltısı', price: 900 },
      { name: 'Menemen', price: 200 },
      { name: 'Sucuklu Yumurta', price: 200 },
      { name: 'Kavurmalı Yumurta', price: 250 },
      { name: 'Omlet', price: 150 },
      { name: 'Kaşarlı Omlet', price: 175 },
      { name: 'Kavurmalı Omlet', price: 250 },
      { name: 'Otlu Omlet', price: 175 },
      { name: 'Mantarlı Omlet', price: 200 },
      { name: 'Pişi Tabağı', price: 250 },
      { name: 'Sigara Böreği Tabağı', price: 200 },
      { name: 'Kırmızı Meyveli Granola', price: 250 },
      { name: 'Mevsim Meyveli Yulaf Lapası', price: 200 },
    ]
  },
  {
    name: 'Ekstra Lezzet',
    items: [
      { name: 'Mini Kahvaltılık (Adet)', price: 50 },
      { name: 'Pişi', price: 100 },
      { name: 'Sigara Böreği', price: 100 },
      { name: 'Anne Patatesi', price: 100 },
      { name: 'Söğüş Tabağı', price: 100 },
      { name: 'Avokado Sos', price: 150 },
      { name: 'Mücver', price: 150 },
      { name: 'Ege Usulü Karışık Kızartma', price: 250 },
      { name: 'Dörtlü Meze Tabağı', price: 250 },
    ]
  },
  {
    name: 'Sandviç',
    items: [
      { name: 'Beyaz Peynirli Sandviç', price: 150 },
      { name: 'Dana Jambonlu Sandviç', price: 175 },
      { name: 'Hindi Fümeli Sandviç', price: 175 },
      { name: 'Full Karışık Sandviç', price: 200 },
      { name: 'Mücver Sandviç', price: 180 },
      { name: 'Patso', price: 150 },
    ]
  },
  {
    name: 'Tost',
    items: [
      { name: 'Kaşarlı Tost', price: 150 },
      { name: 'Beyaz Peynirli Tost', price: 150 },
      { name: 'Sucuklu Kaşarlı Tost', price: 175 },
      { name: 'Kavurmalı Tost', price: 200 },
      { name: 'Full Karışık Tost', price: 225 },
    ]
  },
];

async function main() {
  // FK kısıtını kapat, eski test verilerini temizle
  await run('PRAGMA foreign_keys = OFF');
  await run('DELETE FROM order_items');
  await run('DELETE FROM orders');
  await run('DELETE FROM menu_items');
  await run('DELETE FROM categories');
  await run("DELETE FROM sqlite_sequence WHERE name IN ('menu_items','categories','orders','order_items')");
  await run('PRAGMA foreign_keys = ON');
  console.log('✓ Eski test verileri silindi');

  let totalItems = 0;
  for (let i = 0; i < menu.length; i++) {
    const cat = menu[i];
    const catRow = await run(
      `INSERT INTO categories (name, "order", is_available) VALUES (?, ?, 1)`,
      [cat.name, i + 1]
    );
    for (const item of cat.items) {
      await run(
        'INSERT INTO menu_items (category_id, name, price, is_available) VALUES (?, ?, ?, 1)',
        [catRow.lastID, item.name, item.price]
      );
    }
    console.log(`✓ ${cat.name}: ${cat.items.length} ürün`);
    totalItems += cat.items.length;
  }

  console.log(`\n✅ Toplam ${menu.length} kategori, ${totalItems} ürün eklendi.`);
  db.close();
}

main().catch(err => { console.error(err); db.close(); });