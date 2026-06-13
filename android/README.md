# Android Client - Mafia Online

Заглушка для будущего Android-клиента.

## Планы
- Kotlin + Jetpack Compose или Flutter
- Подключение к серверу через Socket.IO
- Адаптивный дизайн под мобильные устройства

## API Endpoints
Сервер предоставляет:
- REST API: `/api/auth/*`, `/api/admin/*`
- WebSocket: Socket.IO на порту 3001

## Авторизация
Используйте JWT токены для подключения к WebSocket:
```javascript
const socket = io('SERVER_URL', {
  auth: { token: 'your-jwt-token' }
});
```
