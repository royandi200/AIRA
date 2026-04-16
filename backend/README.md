# AIRA Backend — API de Pagos y Boletería

Backend Node.js + Express + MySQL para el sistema de reservas y pagos de AIRA Events.

---

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 20+ (ESM) |
| Framework | Express 4 |
| Base de datos | MySQL 8 / PlanetScale / Railway |
| Pagos | MercadoPago SDK v2 |
| Email | Nodemailer (Gmail) |
| QR | qrcode |

---

## Inicio rápido

```bash
# 1. Instalar dependencias
cd backend
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# → Edita .env con tus credenciales

# 3. Crear base de datos y tablas
npm run migrate

# 4. Cargar datos de prueba (evento Guatapé)
npm run seed

# 5. Arrancar en desarrollo
npm run dev
# → http://localhost:3001
```

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (default: 3001) |
| `FRONTEND_URL` | URL del frontend React (CORS) |
| `DB_URL` | URL completa MySQL (Railway/PlanetScale) |
| `DB_HOST/USER/PASS/NAME` | Credenciales MySQL individuales |
| `MP_ACCESS_TOKEN` | Token de MercadoPago (producción o TEST-) |
| `MAIL_USER` | Gmail para envío de boletas |
| `MAIL_PASS` | App Password de Gmail |

---

## Endpoints

### Eventos
```
GET  /api/events                    — Lista eventos activos
GET  /api/events/:id/ticket-types   — Tipos de boleta de un evento
```

### Órdenes
```
POST /api/orders/create             — Crear orden pendiente
GET  /api/orders/:id                — Detalle de orden
GET  /api/orders/by-email/:email    — Órdenes por email
```

### Pagos (MercadoPago)
```
POST /api/payments/create-preference  — Generar URL de pago MP
POST /api/payments/webhook            — Webhook de notificaciones MP
GET  /api/payments/status/:orderId    — Estado de pago
```

### Boletas / QR
```
GET  /api/tickets/qr/:code         — Imagen QR PNG de la boleta
GET  /api/tickets/validate/:code   — Validar boleta en puerta
```

---

## Flujo completo

```
Usuario compra en React
  → POST /api/orders/create        (crea orden + items en MySQL)
  → POST /api/payments/create-preference  (genera URL de MercadoPago)
  → Redirige a MercadoPago
  → Usuario paga
  → MP llama al webhook
  → Orden se marca 'paid'
  → Email con QR enviado al comprador
  → En puerta: GET /api/tickets/validate/:code
```

---

## Despliegue recomendado

| Servicio | Uso | Plan gratis |
|---|---|---|
| **Railway** | Backend + MySQL | ✅ Starter |
| **PlanetScale** | Solo MySQL | ✅ Hobby |
| **Render** | Backend alternativo | ✅ Free |

```bash
# Railway (recomendado — deploy en 2 minutos)
npx @railway/cli login
npx @railway/cli up
```
