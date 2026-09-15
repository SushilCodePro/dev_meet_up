# Project Summary: Developers Adda (dev-meet-up API)

## What I Built
- **Developers Adda**: A professional networking platform backend for developers to discover, connect, and collaborate.
- A robust, high-performance, and secure RESTful API server.

## Concepts Covered
- **Stateless Authentication**: Using JSON Web Tokens (JWT) stored securely in HTTP-Only cookies.
- **Security Mechanisms**: Password hashing (Bcrypt), XSS & CSRF defense (cookie-parser), and CORS configuration.
- **Token Invalidation**: Implementing a high-performance Redis-based blacklist for secure logouts.
- **Rate-Limiting & IP Ban**: Preventing brute-force attacks via distributed counting (RedisStore) with IP + Email level blocking.

## System Design Covered
- **Stateless & Scalable Architecture**: Decoupling session state using Redis to allow horizontal scaling across multiple instances (e.g., behind a load balancer).
- **Caching & Fast Lookups**: Leveraging Redis for in-memory key-value lookups (blacklist) and centralized rate limiting.
- **Client-Server Authentication Flow**: Designing clear sequences for sign-in, request validation, and secure logout.

## Backend Concepts
- **Modular Codebase**: Using modern ES6 modules (imports/exports) for clean routes, controllers, and middlewares in Node.js/Express.js.
- **Data Validation**: Input validation (email formats, strong passwords) at the API controller boundary.
- **Core Business Logic**: Connection and networking engine (handling sending, accepting, and rejecting requests).
- **Custom Recommendation Logic**: A Smart User Feed that filters out the logged-in user, existing connections, pending requests, and ignored users.

## Database Concepts
- **Data Modeling (MongoDB & Mongoose)**: Designing schemas for complex relationships (users, skills, bidirectional connection requests).
- **Advanced Queries**: Building custom MongoDB aggregation and filtering queries for the user feed.
- **Automated Data Expiration**: Utilizing TTL (Time-To-Live) keys in Redis to automatically clean up expired tokens and optimize memory.
