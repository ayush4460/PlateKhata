# Axios - Restaurant QR Ordering System Frontend

A modern, responsive web application for restaurant customers to browse menus, place orders, and manage payments using QR codes. Built with **Next.js 15**, **React 18**, **TypeScript**, and **Tailwind CSS**.

## Features

### Customer Experience
- ✨ **QR Code-Based Ordering** - Scan table QR codes to access the menu
- 🍽️ **Dynamic Menu Browse** - Browse categorized menu items with images and descriptions
- 🔍 **Smart Search** - Real-time search across menu items
- 🛒 **Shopping Cart** - Add/remove items and manage quantities
- 📋 **Order History** - View past orders with detailed information
- 💳 **Payment Options** - Support for Cash, UPI, and Card payments
- 📄 **Digital Receipt** - Generate and download receipts as PDF
- 🌙 **Dark Mode** - Toggle between light and dark themes

### Admin Dashboard
- 📊 **Analytics Dashboard** - View revenue, order statistics, and trends
- 🍽️ **Menu Management** - Add, edit, and manage menu items
- 📦 **Table Management** - Create and manage restaurant tables
- 🧾 **Order Management** - Monitor and update order statuses
- 👥 **Role-Based Access** - Admin, Kitchen, and Waiter roles

### Kitchen Display System
- 📱 **Live Order Queue** - Real-time kitchen order display
- ✅ **Order Status Tracking** - New, In-Progress, and Ready orders
- 🔔 **Notifications** - WebSocket-based live updates
- 🏃 **Quick Status Updates** - One-click order state transitions

## Tech Stack

- **Framework:** Next.js 15.3 with Turbopack
- **UI Library:** React 18 with TypeScript
- **Styling:** Tailwind CSS with dark mode support
- **Components:** Radix UI (unstyled, accessible components)
- **State Management:** Zustand + React Context
- **Form Handling:** React Hook Form with Zod validation
- **Data Visualization:** Recharts
- **Real-time:** Socket.IO client
- **Utilities:** date-fns, clsx, tailwind-merge
- **QR Codes:** qrcode.react
- **PDF Generation:** jsPDF with AutoTable
- **AI Integration:** Google Genkit (optional)

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0 (or yarn/pnpm)
- Backend API running on `http://localhost:5000` (or configured via `NEXT_PUBLIC_API_URL`)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd munchmate/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   # Create .env.local
   touch .env.local
   ```
   
   Add the following:
   ```env
   # Backend API URL (default: http://localhost:5000/api/v1)
   NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:9002`

## Development

### Available Scripts

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Type checking
npm run typecheck
```

## Project Structure

```
src/
├── app/                      # Next.js app directory
│   ├── page.tsx             # Home/Menu page
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # Global styles
│   ├── cart/                # Shopping cart page
│   ├── dashboard/           # Admin dashboard
│   ├── kitchen/             # Kitchen display system
│   ├── login/               # Authentication
│   └── orders/              # Order history
│
├── components/               # Reusable React components
│   ├── auth/                # Authentication components
│   ├── dashboard/           # Admin dashboard components
│   ├── kitchen/             # Kitchen display components
│   ├── layout/              # Layout components (header, nav, etc.)
│   ├── payment/             # Payment-related components
│   └── ui/                  # Primitive UI components (buttons, forms, etc.)
│
├── hooks/                    # Custom React hooks
│   ├── use-auth.tsx         # Authentication context and hook
│   ├── use-cart.tsx         # Cart state management and context
│   ├── use-mobile.tsx       # Mobile device detection
│   └── use-toast.ts         # Toast notifications
│
├── lib/                      # Utility functions and types
│   ├── types.ts             # TypeScript type definitions
│   └── utils.ts             # Helper functions (cn, etc.)
│
└── public/                   # Static assets
    └── images/              # Public images
```

## Key Workflows

### Customer Order Flow
1. **Scan QR Code** - Customer scans table QR code with phone
2. **Browse Menu** - Explore categorized menu items
3. **Add to Cart** - Select items and customize quantities
4. **Checkout** - Review cart and place order
5. **Track Order** - Monitor order status in real-time
6. **Payment** - Request payment via Cash or UPI
7. **Receipt** - Download digital receipt

### Admin Workflow
1. **Login** - Authenticate with admin credentials
2. **Dashboard** - View analytics and business metrics
3. **Menu Management** - Add/edit/delete menu items
4. **Table Management** - Create and manage tables
5. **Order Monitoring** - View and manage all orders
6. **Settings** - Configure tax rates and discounts

### Kitchen Workflow
1. **View Queue** - See new orders in real-time
2. **Confirm Order** - Move order to "In Progress"
3. **Mark Ready** - Move order to "Ready" for pickup
4. **Complete** - Confirm order has been served

## API Integration

The frontend communicates with the backend API at `/api/v1`:

### Key Endpoints Used

**Public Endpoints:**
- `GET /menu` - Fetch all menu items
- `POST /orders` - Create new order
- `GET /orders` - Fetch customer orders (with session token)

**Admin Endpoints (requires JWT):**
- `GET /tables` - List all tables
- `POST /tables` - Create new table
- `PATCH /orders/:id/status` - Update order status
- `PATCH /settings` - Update tax/discount rates
- `GET /orders/kitchen/active` - Get active kitchen orders

**Real-time (Socket.IO):**
- `newOrder` - New order notification
- `orderStatusUpdate` - Order status change
- `disconnect` - Connection lost

## State Management

### Cart Context (`use-cart.tsx`)
Manages:
- Shopping cart items
- Order placement and history
- Kitchen orders (admin)
- Analytics data
- Table management
- Settings (tax, discount rates)
- Socket.IO connection

### Auth Context (`use-auth.tsx`)
Manages:
- Admin user session
- Login/logout
- Access token storage
- Auth state

## Authentication

- **Customers:** Session tokens (stored after order placement)
- **Admin/Kitchen:** JWT tokens from backend
- **Headers:**
  - `Authorization: Bearer <token>` for JWT
  - `x-session-token: <token>` for customer sessions

## Real-time Updates

WebSocket connection via Socket.IO enables:
- Live order notifications
- Real-time order status updates
- Kitchen display system updates
- Automatic cart/order refresh

## Customization

### Theming
Edit `tailwind.config.ts` to customize:
- Color scheme
- Typography
- Spacing
- Component variants

## Performance Optimization

- **Turbopack** - Fast builds and HMR
- **Image Optimization** - Next.js Image component with responsive sizing
- **Code Splitting** - Automatic route-based code splitting
- **Caching** - Zustand for efficient state management
- **Lazy Loading** - Components loaded on demand

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)


## License

MIT


**Happy ordering! 🍽️**
