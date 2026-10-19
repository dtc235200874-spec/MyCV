CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  category_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  address TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- seed categories
INSERT OR IGNORE INTO categories (id, name, slug) VALUES
 (1,'Điện thoại','dien-thoai'),
 (2,'Laptop','laptop'),
 (3,'Phụ kiện','phu-kien'),
 (4,'Tivi','tivi'),
 (5,'Gia dụng','gia-dung');

-- seed products
INSERT OR IGNORE INTO products (id,name,description,price,stock,image,category_id) VALUES
 (1,'iPhone 15 Pro 128GB','Chip A17 Pro, khung titan, camera 48MP.',24990000,25,'https://picsum.photos/seed/iphone15/400/400',1),
 (2,'Samsung Galaxy S24','Snapdragon 8 Gen 3, AI Galaxy.',20990000,30,'https://picsum.photos/seed/s24/400/400',1),
 (3,'Xiaomi 14','Leica camera, Snapdragon 8 Gen 3.',17990000,40,'https://picsum.photos/seed/xiaomi14/400/400',1),
 (4,'MacBook Air M3','13 inch, 8GB/256GB, pin 18h.',28990000,15,'https://picsum.photos/seed/macbookair/400/400',2),
 (5,'Dell XPS 13','Intel Core Ultra, OLED 13.4 inch.',32990000,10,'https://picsum.photos/seed/dellxps/400/400',2),
 (6,'Asus ROG Strix','Gaming laptop RTX 4060.',35990000,8,'https://picsum.photos/seed/rog/400/400',2),
 (7,'AirPods Pro 2','Chống ồn chủ động, USB-C.',5990000,60,'https://picsum.photos/seed/airpods/400/400',3),
 (8,'Chuột Logitech MX Master 3S','Chuột không dây cao cấp.',2490000,50,'https://picsum.photos/seed/mxmaster/400/400',3),
 (9,'Bàn phím cơ Keychron K2','Switch Gateron, Bluetooth.',1890000,45,'https://picsum.photos/seed/keychron/400/400',3),
 (10,'Samsung 55 inch 4K','Smart TV Crystal UHD.',12990000,12,'https://picsum.photos/seed/tv55/400/400',4),
 (11,'LG OLED 65 inch','OLED evo, 4K 120Hz.',45990000,5,'https://picsum.photos/seed/lgoled/400/400',4),
 (12,'Nồi chiên không dầu Philips','6.2L, Rapid Air.',3490000,25,'https://picsum.photos/seed/philips/400/400',5),
 (13,'Máy lọc không khí Xiaomi','HEPA, 400m3/h.',2990000,20,'https://picsum.photos/seed/airpurifier/400/400',5),
 (14,'Máy hút bụi Dyson V15','Laser detect, 60 phút.',16990000,7,'https://picsum.photos/seed/dyson/400/400',5),
 (15,'iPad Air M2','11 inch, 128GB, WiFi.',16990000,18,'https://picsum.photos/seed/ipadair/400/400',1),
 (16,'Lenovo ThinkPad X1','Business ultrabook.',38990000,6,'https://picsum.photos/seed/thinkpad/400/400',2),
 (17,'Loa JBL Flip 6','Bluetooth, chống nước IP67.',2990000,35,'https://picsum.photos/seed/jblflip/400/400',3),
 (18,'SSD Samsung 1TB','NVMe PCIe 4.0.',2490000,80,'https://picsum.photos/seed/ssd/400/400',3),
 (19,'Tivi Sony 75 inch','Bravia XR, 4K.',59990000,3,'https://picsum.photos/seed/sonytv/400/400',4),
 (20,'Robot hút bụi Ecovacs','Laser mapping, tự đổ bụi.',12990000,9,'https://picsum.photos/seed/ecovacs/400/400',5);

-- seed users (password: admin123 / 123456)
INSERT OR IGNORE INTO users (id,name,email,password_hash,role) VALUES
 (1,'Admin','admin@shop.com','$2b$10$eBkbIzwxc367X1Lgdho4wuOswka/0dZx0760/At2WWKffGr8g1l82','admin'),
 (2,'Khách hàng demo','user@shop.com','$2b$10$MscqILmfLJLQIM5iMU5shu0q1hyhtH.tYYuykKy6AFO5KP4syS4N.','customer');
