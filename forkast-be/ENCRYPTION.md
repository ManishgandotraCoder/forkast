# Encryption Implementation Guide

This document outlines the comprehensive asymmetric encryption system implemented in the Forkast Trading Platform.

## Overview

The encryption system provides multiple layers of security:

1. **RSA Encryption** - For sensitive user data (email, personal information)
2. **AES-256-CBC Encryption** - For trading data (orders, balances, transactions)
3. **Client-side Encryption** - For secure data storage and transmission
4. **API-level Encryption** - For secure communication between frontend and backend

## Architecture

### Backend Encryption Service

Located in `src/modules/crypto/encryption.service.ts`, this service provides:

- RSA key pair generation and management
- AES-256-CBC encryption/decryption
- User data encryption/decryption
- Trading data encryption/decryption
- Password hashing with PBKDF2
- Secure token generation

### Frontend Encryption Utilities

Located in `src/lib/encryption.ts`, this utility provides:

- Client-side AES encryption/decryption
- Secure data storage encryption
- API request/response encryption
- Password hashing and verification

## Database Schema Updates

The Prisma schema has been updated to include encrypted fields:

### User Model
```prisma
model User {
  id           Int               @id @default(autoincrement())
  email        String            @unique
  password     String
  name         String
  age          Int?
  encryptedEmail String?         // Encrypted email for additional security
  encryptedName  String?         // Encrypted name for additional security
  publicKey    String?           // User's RSA public key
  createdAt    DateTime          @default(now())
  // ... other fields
}
```

### Order Model
```prisma
model Order {
  id             Int      @id @default(autoincrement())
  userId         Int
  type           String
  symbol         String
  price          Float
  quantity       Float
  // ... other fields
  encryptedSymbol String? // Encrypted symbol for additional security
  encryptedPrice  String? // Encrypted price for additional security
  encryptedQuantity String? // Encrypted quantity for additional security
  // ... other fields
}
```

### Trade Model
```prisma
model Trade {
  id           Int      @id @default(autoincrement())
  // ... other fields
  price        Float
  quantity     Float
  encryptedPrice String? // Encrypted price for additional security
  encryptedQuantity String? // Encrypted quantity for additional security
  // ... other fields
}
```

### Balance Model
```prisma
model Balance {
  id        Int      @id @default(autoincrement())
  userId    Int
  symbol    String
  amount    Float    @default(0)
  locked    Float    @default(0)
  // ... other fields
  encryptedSymbol String? // Encrypted symbol for additional security
  encryptedAmount String? // Encrypted amount for additional security
  encryptedLocked String? // Encrypted locked amount for additional security
  // ... other fields
}
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Encryption Configuration
AES_KEY=your-32-character-aes-key-here
RSA_KEY_SIZE=2048
ENABLE_ENCRYPTION=true
```

### Backend Configuration

The encryption settings are configured in `src/config/configuration.ts`:

```typescript
encryption: {
  aesKey: process.env.AES_KEY || 'default-aes-key-change-in-production-32-chars',
  rsaKeySize: parseInt(process.env.RSA_KEY_SIZE || '2048', 10),
  enableEncryption: process.env.ENABLE_ENCRYPTION === 'true' || true,
}
```

## Usage

### Backend Usage

#### 1. Inject the EncryptionService

```typescript
import { EncryptionService } from '../crypto/encryption.service';

@Injectable()
export class YourService {
  constructor(private encryptionService: EncryptionService) {}
  
  async encryptUserData(data: any) {
    return this.encryptionService.encryptUserData(data);
  }
}
```

#### 2. Encrypt Sensitive Data

```typescript
// Encrypt user data
const encryptedUserData = this.encryptionService.encryptUserData({
  email: 'user@example.com',
  name: 'John Doe'
});

// Encrypt trading data
const encryptedTradingData = this.encryptionService.encryptTradingData({
  symbol: 'BTC-USD',
  price: 50000,
  quantity: 0.1
});
```

#### 3. Decrypt Data

```typescript
// Decrypt user data
const decryptedUserData = this.encryptionService.decryptUserData(encryptedUserData);

// Decrypt trading data
const decryptedTradingData = this.encryptionService.decryptTradingData(encryptedTradingData);
```

### Frontend Usage

#### 1. Import Encryption Utilities

```typescript
import { EncryptionUtils } from '@/lib/encryption';
```

#### 2. Encrypt Data for Storage

```typescript
const userData = { id: 1, email: 'user@example.com', name: 'John Doe' };
const encryptionKey = EncryptionUtils.generateAESKey();
const encryptedData = EncryptionUtils.encryptForStorage(userData, encryptionKey);

// Store in localStorage
localStorage.setItem('user', encryptedData);
localStorage.setItem('encryptionKey', encryptionKey);
```

#### 3. Decrypt Data from Storage

```typescript
const encryptedData = localStorage.getItem('user');
const encryptionKey = localStorage.getItem('encryptionKey');
const decryptedData = EncryptionUtils.decryptFromStorage(encryptedData, encryptionKey);
```

#### 4. Encrypt API Requests

```typescript
const orderData = {
  symbol: 'BTC-USD',
  price: 50000,
  quantity: 0.1
};

const encryptedOrderData = EncryptionUtils.encryptTradingData(orderData);
// Send encryptedOrderData to API
```

## API Endpoints

### Encryption Controller

The encryption controller provides endpoints for encryption operations:

- `GET /encryption/public-key` - Get the public key for client-side encryption
- `POST /encryption/encrypt` - Encrypt data (requires authentication)
- `POST /encryption/decrypt` - Decrypt data (requires authentication)

## Migration

### Encrypt Existing Data

Run the migration script to encrypt existing data:

```bash
cd forkast-be
npx ts-node src/scripts/encrypt-existing-data.ts
```

This script will:
1. Generate RSA key pairs for users who don't have them
2. Encrypt all existing user data
3. Encrypt all existing trading data
4. Update the database with encrypted fields

## Security Considerations

### Key Management

1. **RSA Keys**: Generated per user and stored in the database
2. **AES Keys**: Generated per session and stored securely
3. **Master Keys**: Stored in environment variables

### Best Practices

1. **Never log sensitive data** - Always log encrypted versions
2. **Use HTTPS** - Ensure all communication is encrypted in transit
3. **Rotate keys regularly** - Implement key rotation policies
4. **Secure key storage** - Use secure key management systems in production
5. **Validate encryption** - Always validate encrypted data before use

### Production Deployment

1. **Generate strong keys** - Use cryptographically secure random keys
2. **Use environment variables** - Never hardcode keys in source code
3. **Implement key rotation** - Regularly rotate encryption keys
4. **Monitor encryption** - Log encryption/decryption operations
5. **Backup keys securely** - Store key backups in secure locations

## Testing

### Unit Tests

```bash
# Run encryption service tests
npm run test -- --testPathPattern=encryption

# Run integration tests
npm run test:e2e -- --testPathPattern=encryption
```

### Manual Testing

1. **Register a new user** - Verify data is encrypted in database
2. **Place an order** - Verify trading data is encrypted
3. **Check API responses** - Verify data is decrypted for frontend
4. **Test data migration** - Verify existing data is properly encrypted

## Troubleshooting

### Common Issues

1. **Encryption/Decryption Errors**: Check key consistency and data format
2. **Performance Issues**: Consider caching encrypted data
3. **Migration Failures**: Ensure database schema is up to date
4. **Frontend Errors**: Verify encryption utilities are properly imported

### Debug Mode

Enable debug logging by setting:

```env
LOG_LEVEL=debug
```

This will log encryption/decryption operations for debugging.

## Future Enhancements

1. **Key Rotation**: Implement automatic key rotation
2. **Hardware Security Modules**: Use HSM for key management
3. **Zero-Knowledge Architecture**: Implement zero-knowledge proofs
4. **Quantum-Resistant Encryption**: Prepare for post-quantum cryptography
5. **Audit Logging**: Implement comprehensive audit trails

## Support

For questions or issues with the encryption implementation:

1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Ensure database schema is up to date
4. Test with a fresh user registration

## License

This encryption implementation is part of the Forkast Trading Platform and follows the same license terms.
