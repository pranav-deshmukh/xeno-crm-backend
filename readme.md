# Xeno CRM — Backend

## Overview

This repository contains the backend services for **Xeno CRM**, a customer segmentation and campaign orchestration platform. The backend is implemented in **TypeScript** using **Express.js** Mongoose (MongoDB), redis and is responsible for:

- Exposing RESTful APIs for customers, orders, segments, campaigns and dashboard statistics.
- Validating incoming data and publishing change events to a message stream (Redis) for asynchronous processing.
- Initiating campaign delivery to third-party vendor APIs and processing delivery receipts in efficient batches.
- Providing AI-assisted helpers (message suggestions and natural-language → segment rules) via an external generative model (configurable).

This README documents the system purpose, high-level architecture, installation steps (including Redis via Docker Compose), environment variables, and quick usage notes.

---

## High-level architecture

1. **API Layer (Express + TypeScript)**

   - Controllers implement endpoints for creating and querying customers, orders, segments and campaigns.
   - Input schema validation is performed using `zod`.

2. **Persistence (MongoDB / Mongoose)**

   - Primary domain models: `Customer`, `Order`, `Segment`, `Campaign`, `CommunicationLog`.
   - Custom IDs (UUIDs) are used for segments and campaigns to decouple them from MongoDB ObjectIds.

3. **Messaging / Streams (Redis)**

   - Events (e.g., create-customer, create-order) are published to Redis Streams by a `MessageProducer` service.
   - Downstream services (workers/consumers) can subscribe to these streams to perform eventual work.

4. **Delivery Pipeline**

   - Campaign creation compiles a list of communication log entries and schedules delivery.
   - Delivery to vendor APIs is performed asynchronously (staggered send) and delivery receipts are accepted via a `delivery-receipt` endpoint.
   - A `DeliveryReceiptProcessor` batches receipt updates and performs bulk writes to update message logs and campaign counters.

5. **AI Layer**

   - Optional integration with a generative model (example: Gemini) to generate campaign copy and to convert natural-language audience descriptions to structured segment rules.
   - The AI integration is configurable by environment variable — if the key is absent the controllers provide intelligent fallback content.

6. **Dashboard & Aggregations**

   - A dashboard controller aggregates metrics (total customers, campaigns, delivery rate, recent campaigns and top segments) using MongoDB aggregation pipelines and helper calculations.

---

## Quick feature summary

- REST APIs to create/query customers, orders, segments and campaigns.
- Segment preview API that compiles demographic summaries and audience counts for the UI.
- Segment save API that persists a segment (audience size computed server-side).
- Campaign creation pipeline that logs communications and starts delivery.
- Delivery receipt endpoint with a background batch processor to update logs and campaign counters efficiently.
- AI endpoints for message suggestions and NL → segment rule conversion (configurable via environment).

---

## Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- MongoDB (local or Atlas)
- Docker & Docker Compose (for Redis during local development)
- (Optional) RedisInsight for local Redis inspection

---

## Environment variables

Create a `.env` file at the project root and populate the following variables (example values shown):

```
# Server
PORT=8080
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/xenocrm

# Redis (used for streams/eventing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AI
GEMINI_API_KEY=



```

> Note: In production use secure credentials and do not commit `.env` to source control.

---

## Install and run (development)

1. Clone the repository

```bash
git clone <repo-url>
cd <repo-folder>
```

2. Install dependencies

```bash
npm install
# or
# yarn install
```

3. Start Redis (see Docker Compose section below) and ensure MongoDB is accessible.

4. Start the server (development)

```bash
npm run dev
```

> If there is no `dev` script in `package.json`, you can run with `ts-node-dev` or compile then run:

```bash
npx ts-node-dev --respawn --transpile-only src/index.ts
# or
npm run build
npm start
```

---

## Redis using Docker Compose (local development)

To start Redis and RedisInsight:

```bash
docker compose up -d
```

Confirm Redis is reachable locally:

```bash
redis-cli -h 127.0.0.1 -p 6379 ping
# expected: PONG
```

RedisInsight will be available on `http://localhost:8001` (use it to inspect streams and keys).

---

## Example requests (representative)

> These examples are intended to illustrate typical payloads. The repository exposes more endpoints; you can use the included Postman collection or published docs for a full list.

### Create customer (POST `/api/customers`)

```json
{
  "customer_id": "CUST123",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "registration_date": "2025-09-01T10:00:00Z",
  "city": "Mumbai",
  "total_spent": 15000,
  "total_orders": 5,
  "last_order_date": "2025-09-10T10:00:00Z"
}
```

### Save segment (POST `/api/segments/save`)

**Important**: the Mongoose schema requires each rule to include an `id` property. Include `id` values in the posted rules.

```json
{
  "name": "High Value Customers",
  "description": "Customers in Mumbai with > 10k spent",
  "rules": [
    { "id": "rule-1", "field": "total_spent", "operator": ">", "value": 10000 },
    {
      "id": "rule-2",
      "field": "city",
      "operator": "=",
      "value": "Mumbai",
      "logic": "AND"
    }
  ]
}
```

### Preview segment (POST `/api/segments/preview`)

```json
{
  "rules": [
    { "field": "total_spent", "operator": ">", "value": 25000 },
    { "field": "total_orders", "operator": ">=", "value": 5 }
  ]
}
```

---

## Postman collection & API documentation

- It is recommended to export a Postman collection (`v2.1`) and include it in the repository under `/postman` so evaluators can import it.
- The collection can serve as human-readable documentation (request summaries, example bodies, example responses) and can be published to Postman documentation for a slick web-hosted docs page.

---

## Frontend link

The frontend is a separate application that consumes these APIs. Update the following placeholder with the real URL or repo path for your frontend project:

- Frontend repo / deploy URL: `https://github.com/<your-org>/<frontend-repo>`
- Frontend expects `NEXT_PUBLIC_SERVER_API_URL` to point at this backend (example: `http://localhost:8080`).

---

## Operational notes and recommendations

- **Production readiness**: Use managed Redis and MongoDB services for production. Enable authentication and TLS for both Redis and MongoDB.
- **AI integration**: If `GEMINI_API_KEY` (or the configured AI key) is not set, the AI endpoints will return fallback suggestions. Rate-limit AI requests to avoid cost spikes.
- **Delivery reliability**: The delivery pipeline is intentionally asynchronous and uses staggered requests and batching for receipts; tune batch sizes and intervals according to your vendor SLA.
- **Schema defaults**: For better UX it is suggested to assign default `id` values to rule subdocuments server-side (Mongoose default) to avoid client-side requirement for `id` unless the UI depends on them.

---

## Contributing

1. Create an issue describing the change or bug.
2. Open a branch named `fix/brief-description` or `feature/brief-description`.
3. Open a pull request with a clear description and reference to the issue.

---

## API Documentation

https://web.postman.co/documentation/27455292-27b34545-351f-4988-9856-aa2d8d45d916/publish?workspaceId=2417424f-dd47-4729-8610-bbd061ccea86
