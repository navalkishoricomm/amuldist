# Deployment Log

This file tracks deployment details, server configuration, and a changelog of updates pushed to the production server.

## Server Details
- **IP Address**: `2602:ff16:13:104e::1` (IPv6)
- **SSH User**: `root`
- **Remote Path**: `/var/www/amuldist/server`
- **Process Manager**: `pm2`
- **Service Name**: `amul-dist-server`
- **Database**: MongoDB (Local on server)

## Deployment Commands
To upload changes manually (Windows PowerShell):
```powershell
# Upload specific file
scp -r server/path/to/file root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/path/to/file

# Restart Server
ssh root@2602:ff16:13:104e::1 "pm2 restart amul-dist-server"
```

---

## Changelog

### 2026-01-29 (Fixes)
**Fixed SD Login Role & Stock Out Amount Calculation**
- **Files Modified**:
  - `server/static/index.html`: Removed conflicting inline login script to fix "Unknown role" error for Super Distributors.
  - `server/static/admin.html`: Fixed "Add User" modal UI issues.
  - `server/static/app.js`: 
    - Corrected compound unit calculation logic (Price * Qty instead of Price / Conv).
    - Added `showStockOutDetails` for detailed breakdown with correct rate display.
    - Updated `showOrderDetails` to match fixed calculation logic.
  - `server/index.js`: 
    - Fixed compound unit calculation logic in backend stock-out and recompute routes.
    - Added product price fallback for zero-price scenarios.
- **Action**: Uploaded modified files (`server/index.js`, `server/static/app.js`, `server/static/admin.html`, `server/static/index.html`) and restarted `amul-dist-server`.
- **Status**: Deployed & Verified.

### 2026-01-29
**Fixed Stock Out Calculation & Order Details Modal**
- **Files Modified**:
  - `server/index.js`: Updated `/api/my/transactions` to populate nested unit details (compound units) for products in orders.
  - `server/static/app.js`: 
    - Updated `showStockOutDetails` to correctly calculate and display compound unit quantities and prices.
    - Updated `showOrderDetails` to use `item.price` instead of falling back to `product.price`.
- **Action**: Uploaded modified files (`server/index.js`, `server/static/app.js`) and restarted `amul-dist-server`.
- **Status**: Deployed & Verified.

### 2026-01-08
**Fixed Stock Out "Not Found" Error & Breakdown Discrepancy**
- **Files Modified**:
  - `server/static/app.js`: 
    - Added error handling in `renderStockOut` to catch 404s during updates and re-create entries if missing.
    - Updated `formatUnitQty` to use `Math.floor` instead of `Math.trunc` for correct compound unit calculation.
    - Enhanced `showOutBreakdown` to robustly handle compound unit casing and resolution.
  - `server/index.js`:
    - Added missing `GET /api/products/:id` endpoint to support breakdown modal unit fetching.
- **Action**: Uploaded modified files and restarted `amul-dist-server`.
- **Status**: Deployed & Verified.

### 2026-01-08
**Fixed "No Changes Detected" Error on Stock Out Save**
- **Files Modified**:
  - `server/static/app.js`:
    - Updated `saveStockOutBtn` handler to **capture user inputs** before calling `loadDailyData()`.
    - **Reason**: The previous fix (`loadDailyData` at start of save) was overwriting the user's inputs with server data (resetting them to 0 or old values) before the save logic could read them. This caused the "No changes detected" error and data loss. The new logic captures inputs first, then refreshes IDs, then saves using the captured inputs.
- **Action**: Uploaded `server/static/app.js` and restarted `amul-dist-server`.
- **Status**: Deployed.
