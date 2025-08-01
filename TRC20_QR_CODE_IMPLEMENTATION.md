# 🔗 TRC20 QR Code Implementation

## 📋 Overview

The TRC20 QR code functionality has been fully implemented for the wallet address `TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF`. This provides users with easy access to deposit addresses through QR codes that can be scanned by mobile wallets.

## ✅ **Implementation Components:**

### **🎯 API Endpoint: `/api/deposits/trc20/`**

#### **GET Request - Generate QR Image**
```typescript
GET /api/deposits/trc20?address=TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF&size=300&format=png
```
- **Returns**: PNG or SVG QR code image
- **Parameters**:
  - `address`: TRC20 wallet address (optional, defaults to our address)
  - `amount`: USDT amount for wallet compatibility (optional)
  - `size`: QR code size in pixels (default: 300)
  - `format`: 'png' or 'svg' (default: png)

#### **POST Request - Generate QR Data URL**
```typescript
POST /api/deposits/trc20
{
  "address": "TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF",
  "amount": 100,
  "size": 300,
  "format": "dataurl",
  "includeAmount": false
}
```
- **Returns**: JSON with QR code data URL and metadata
- **Use Case**: Embedding QR codes in web interfaces

#### **PUT Request - Validate Address**
```typescript
PUT /api/deposits/trc20
{
  "address": "TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF"
}
```
- **Returns**: Address validation results
- **Validates**: TRC20 address format (T + 33 characters)

### **🎨 React Component: `TRC20QRCode`**

#### **Usage Example:**
```tsx
import TRC20QRCode from '@/components/TRC20QRCode';

<TRC20QRCode
  address="TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF"
  amount={100}
  includeAmount={false}
  buttonText="Show QR Code"
/>
```

#### **Props:**
- `address`: TRC20 wallet address (default: our deposit address)
- `amount`: USDT amount (optional)
- `size`: QR code size (default: 300px)
- `showButton`: Show/hide trigger button (default: true)
- `buttonText`: Custom button text (default: "Show QR Code")
- `includeAmount`: Include amount in QR for wallet apps (default: false)

### **🔧 Features:**

#### **QR Code Generation**
- **High Quality**: 300x300px PNG images with error correction
- **Wallet Compatible**: TRON URI scheme support (`tron:address?amount=100&token=USDT`)
- **Multiple Formats**: PNG, SVG, and Data URL formats
- **Caching**: Browser caching for improved performance

#### **User Interface**
- **Modal Display**: Professional popup with QR code
- **Copy Function**: One-click address copying with fallback
- **Download Option**: Save QR codes as PNG files
- **Explorer Link**: Direct link to TRON blockchain explorer
- **Responsive Design**: Works on desktop and mobile devices

#### **Validation**
- **Address Format**: Validates TRC20 address pattern
- **Amount Validation**: Ensures positive numeric amounts
- **Error Handling**: Comprehensive error states and recovery

## 🎯 **TRC20 Configuration:**

```typescript
const TRC20_CONFIG = {
  address: 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF',
  network: 'TRC20',
  symbol: 'USDT',
  name: 'TRON Network',
  explorer: 'https://tronscan.org/#/address/',
  validation: /^T[A-Za-z1-9]{33}$/
};
```

## 📱 **QR Code Content Formats:**

### **Simple Address (Default)**
```
TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF
```

### **TRON URI with Amount (Wallet Compatible)**
```
tron:TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF?amount=100&token=USDT
```

## 🔍 **Integration Points:**

### **Deposit Page Integration**
- **File**: `src/app/(dashboard)/wallet/deposit/page.tsx`
- **Usage**: Automatically uses TRC20QRCode component for TRC20 deposits
- **Fallback**: Generic QR generation for other networks

### **Test Page**
- **File**: `src/app/test-trc20-qr/page.tsx`
- **Purpose**: Comprehensive testing of TRC20 QR functionality
- **Features**: API testing, component testing, validation testing

## 🧪 **Testing:**

### **Manual Testing Steps:**
1. **Visit**: `/test-trc20-qr`
2. **Validate**: Test address validation with different formats
3. **Generate**: Create QR codes with various parameters
4. **Component**: Test the React component functionality
5. **Download**: Save and verify QR code files
6. **Scan**: Use mobile wallet to scan generated QR codes

### **API Testing:**
```bash
# Test QR generation
curl -X POST http://localhost:8000/api/deposits/trc20 \
  -H "Content-Type: application/json" \
  -d '{"address":"TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF","format":"dataurl"}'

# Test address validation
curl -X PUT http://localhost:8000/api/deposits/trc20 \
  -H "Content-Type: application/json" \
  -d '{"address":"TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF"}'
```

## 🔐 **Security Features:**

### **Address Validation**
- **Pattern Matching**: Strict TRC20 format validation
- **Length Checking**: Ensures 34-character addresses
- **Character Set**: Validates allowed characters (T + base58)

### **Input Sanitization**
- **Amount Validation**: Prevents negative or invalid amounts
- **Size Limits**: Restricts QR code size to reasonable bounds
- **Format Validation**: Only allows supported output formats

## 📊 **Performance:**

### **Optimization Features**
- **Browser Caching**: QR images cached for 1 hour
- **Efficient Generation**: Fast QR code creation with optimized settings
- **Lazy Loading**: QR codes generated only when requested
- **Error Correction**: Medium level for balance of size and reliability

## 🚀 **Usage Examples:**

### **Basic QR Code**
```tsx
<TRC20QRCode />
```

### **QR Code with Amount**
```tsx
<TRC20QRCode 
  amount={100} 
  includeAmount={true}
  buttonText="Deposit $100 USDT"
/>
```

### **Custom Address QR**
```tsx
<TRC20QRCode 
  address="TCustomAddress123456789012345678901234"
  size={400}
/>
```

## 🔮 **Future Enhancements:**

1. **Batch QR Generation**: Multiple addresses at once
2. **Custom Styling**: Branded QR codes with logos
3. **Animation**: Animated QR codes for better visibility
4. **Multi-Language**: QR codes with localized text
5. **Analytics**: Track QR code usage and scanning

## 📞 **Support Information:**

- **Wallet Address**: `TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF`
- **Network**: TRC20 (TRON)
- **Explorer**: https://tronscan.org/#/address/TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF
- **Test Page**: `/test-trc20-qr`

The TRC20 QR code system is now fully operational and ready for production use!
