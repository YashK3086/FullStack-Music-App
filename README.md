# Serverless Audio Streaming Platform with ML-Powered Recommendations

[![Frontend: Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Backend: AWS Lambda](https://img.shields.io/badge/Backend-AWS%20Lambda-orange?style=for-the-badge&logo=aws-lambda)](https://aws.amazon.com/lambda/)
[![ML: SageMaker KNN](https://img.shields.io/badge/ML-SageMaker%20KNN-blueviolet?style=for-the-badge&logo=amazon-aws)](https://aws.amazon.com/sagemaker/)
[![IaC: Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC?style=for-the-badge&logo=terraform)](https://www.terraform.io/)
[![CI/CD: GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions)](https://github.com/features/actions)

---

## 📌 Problem Statement & Engineering Justification

Traditional music platforms rely on static playlists and manual curation, failing to adapt to real-time user context (e.g., a gym workout vs. a study session). Building a recommendation engine that is both **context-aware** and **cost-efficient** at scale requires decoupling compute from always-on servers and leveraging managed ML inference.

### The Solution: Serverless + ML-Powered Streaming
This platform solves these challenges with a fully serverless architecture on AWS:
- **Context-Aware Recommendations**: A SageMaker KNN endpoint computes real-time taste vectors from a user's play history (BPM, energy, danceability, valence), then a multi-stage re-ranking algorithm applies genre affinity weighting and a **20% novelty boost** for undiscovered artists.
- **Gym Mode / Focus Sessions**: A DynamoDB session table with TTL auto-expiry switches the recommendation engine to a high-BPM, high-energy filter pipeline — no user intervention needed after activation.
- **Zero Idle Cost**: AWS Lambda functions handle all backend logic (CRUD, sessions, recommendations), scaling to zero when inactive and handling burst traffic elastically.
- **Cognito-Secured API**: Every API Gateway route is authenticated via AWS Cognito JWT tokens, with ownership checks enforced at the Lambda level before any DynamoDB mutation.

---

## 📐 System Architecture & Data Flow

### Infrastructure Overview

<p align="center">
  <img src="docs/architecture.png" alt="FullStack Music App Architecture" width="100%" />
</p>

### Request Lifecycle — Step-by-Step

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Browser)
    participant FE as Next.js Frontend
    participant Cognito as AWS Cognito
    participant APIGW as API Gateway
    participant CRUD as Lambda: CRUD
    participant Session as Lambda: Sessions
    participant Recs as Lambda: Recommendations
    participant DDB as DynamoDB
    participant SM as SageMaker KNN
    participant S3 as S3 (Audio + Art)

    User->>FE: Open App
    FE->>Cognito: Authenticate (Sign Up / Sign In)
    Cognito-->>FE: JWT Token (id_token)

    User->>FE: Play a Track
    FE->>S3: Stream audio file (presigned URL)
    FE->>APIGW: POST /tracks/play (JWT)
    APIGW->>CRUD: Route to CRUD Lambda
    CRUD->>DDB: Update play_history, genre_affinity, artist_affinity

    User->>FE: Request Recommendations
    FE->>APIGW: GET /recommendations (JWT)
    APIGW->>Recs: Route to Recommendations Lambda
    Recs->>DDB: Check active session (TTL)

    alt Gym Mode Active
        Recs->>DDB: Scan tracks WHERE bpm >= 120 AND energy >= 0.8
        Recs-->>FE: High-energy playlist (gym_mode context)
    else Standard Mode
        Recs->>DDB: Fetch user taste profile
        Recs->>SM: Invoke KNN with taste vector [BPM, Energy, Dance, Valence]
        SM-->>Recs: Candidate track_ids + cosine distances
        Recs->>Recs: Multi-stage re-rank (Affinity + Novelty Boost)
        Recs-->>FE: Personalized playlist (personalized context)
    end

    User->>FE: Create Playlist / Favorite Track
    FE->>APIGW: POST /playlists or POST /tracks/favorite (JWT)
    APIGW->>CRUD: Route to CRUD Lambda
    CRUD->>DDB: Put/Update item (ownership verified)
```

---

## 🛠️ Quickstart & Deployment

### 1. Provision Backend Infrastructure (Terraform)
Deploy DynamoDB tables, Lambda functions, API Gateway, Cognito User Pool, S3 bucket, and IAM roles:
```bash
cd backend/terraform
terraform init
terraform plan
terraform apply -auto-approve
```

### 2. Seed Data & Train ML Model
```bash
# Generate mock track metadata and download sample audio
python scripts/generate_mock_metadata.py
python scripts/download_sample_music.py

# Upload audio assets to S3 and seed DynamoDB
python scripts/upload_assets_and_seed.py

# Train and deploy the SageMaker KNN endpoint
python scripts/sagemaker_knn.py
```

### 3. Run the Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:3000
```

### 4. Run Tests
```bash
# Backend unit tests (mocked DynamoDB + SageMaker)
python -m unittest tests/test_backend.py

# Frontend build validation
cd frontend && npm run build
```

---

## ⚡ Key Optimizations & Metrics

### 🧠 Multi-Stage Recommendation Scoring
The recommendation engine goes beyond simple KNN nearest-neighbor retrieval:
```
Score = (CosineSimilarity × 0.5) + (GenreAffinity × 0.3) + (ArtistAffinity × 0.2)
```
- **Novelty Boost**: Candidates from undiscovered artists in target genres receive a **1.2× score multiplier**, promoting fresh content over echo-chamber repetition.
- **Fallback Resilience**: If the SageMaker endpoint is cold-starting or throws an error, the Lambda gracefully degrades to a randomized DynamoDB scan — zero user-facing errors.

### 🏋️ Context-Aware Gym Mode
- Session records use DynamoDB **TTL (Time-To-Live)** with a 1-hour auto-expiry, eliminating the need for cleanup cron jobs.
- Gym Mode filter: `bpm >= 120 AND energy >= 0.8` with genre whitelist (`EDM`, `Metal`, `Gym-Phonk`, `Synthwave`, `Hip-Hop`, `Pop`).

### 📉 Cost & Performance
- **Lambda cold start**: ~200ms (Python 3.11 runtime, minimal dependencies).
- **DynamoDB on-demand pricing**: Zero cost at idle, automatic scaling under load.
- **Play history capped at 20 entries** per user to prevent DynamoDB row bloat and keep taste vector computation under **<50ms**.

### 🔐 Security Model
- **Cognito JWT validation** at API Gateway level — unauthenticated requests are rejected before reaching Lambda.
- **Ownership enforcement**: Every playlist mutation verifies `user_id == claims.sub` before allowing writes, preventing horizontal privilege escalation.
- **CORS restricted** to allowed origins with explicit method/header whitelisting.
