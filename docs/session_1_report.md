# Document Report: Session 1 Summary

**Date**: May 25, 2026  
**Project**: Serverless, Smart Music Streaming Fullstack Application with Context Filtering  
**Repository**: [YashK3086/FullStack-Music-App](https://github.com/YashK3086/FullStack-Music-App)

---

## 🏗️ Architecture & Core Components Created

### 1. Audio Processing Pipeline (Phase 1)
- **Royalty-Free Audio Downloader**: [`download_sample_music.py`](file:///c:/fs-music-app/scripts/download_sample_music.py) downloads 15 raw MP3 files to `data/raw/` and generates a simulated 500-track CSV metadata catalog.
- **Librosa Climax Processor**: [`climax_processor.py`](file:///c:/fs-music-app/scripts/climax_processor.py) calculates RMS energy levels using Short-Time Fourier Transforms (STFT). It locates the peak 10-second climax interval of each song and slices it to `data/processed/`.
- **Database Seeding File**: Mapped the 500 simulated tracks dynamically to point to the 15 raw files and sliced climax previews, creating [`processed_tracks.json`](file:///c:/fs-music-app/data/processed/processed_tracks.json). This guarantees hover-play previews work for every single track in the interface while keeping storage minimal.

### 2. Live AWS Cloud Infrastructure (Phase 2)
- **Terraform Configuration**: Set up modular scripts in [`backend/terraform/`](file:///c:/fs-music-app/backend/terraform) to spin up:
  - **S3 Bucket**: Assets storage for streaming files and serialized model parameters.
  - **DynamoDB Tables**: `Tracks` (partition key: `track_id`), `Users` (partition key: `user_id`), `Playlists` (partition key: `playlist_id`), and `User_Sessions` (partition key: `user_id`, configured with TTL).
  - **Cognito User Pool**: Authentication pool with an App Client.
  - **REST API Gateway**: Integrated with Cognito Authorizers for secure routing.
- **Model Deployment**: [`sagemaker_knn.py`](file:///c:/fs-music-app/scripts/sagemaker_knn.py) fits a scikit-learn K-Nearest Neighbors model based on `BPM`, `Energy`, `Valence`, and `Danceability` vectors, packages it as `model.tar.gz`, uploads it to S3, and deploys it to a hosted SageMaker endpoint.

### 3. Serverless Backend Lambdas (Phase 3)
- **`lambda_crud.py`**: Handles user favoriting (with optimistic UI backend updates) and multi-tenant Playlist CRUD.
- **`lambda_session.py`**: Creates active Gym Mode sessions with a strict 1-hour TTL.
- **`lambda_recommendations.py`**: Fetches user taste profiles, invokes SageMaker KNN, applies multi-stage scoring with **20% new-artist novelty boosts** for target genres, and overrides recommendations with high-tempo (>120 BPM, >0.8 Energy) filters when Gym Mode is active. Contains a scan fallback in case SageMaker times out.
- **Verification Tests**: [`test_backend.py`](file:///c:/fs-music-app/scripts/test_backend.py) contains automated unittests verifying re-ranking math, authentication policies, and fallback boundary triggers.

### 4. Next.js 16 UI Dashboard Client (Phase 4)
- **`AuthContext.tsx`**: Integrates Cognito authentication SDK, supporting registrations, logins, and an instant **Guest Mode bypass**.
- **`AudioContext.tsx`**: Unified state provider managing playback elements, timeline scrubbing, queue skipping, loop/shuffle flags, play logs updates after 15 seconds, and local fallback recommendations for guests.
- **Premium Components**:
  - `TrackCard.tsx`: Displays metadata, hearts to favorite, and features the **300ms debounced hover climax player** using a separate HTML5 audio instance.
  - `Sidebar.tsx`: Handles menus, user signout, playlist lists, and contains the neon orange **Gym Mode toggle** with a live countdown bar.
  - `Player.tsx`: Bottom play control drawer displaying track covers, skipping buttons, seeking timelines, and volume ranges.
  - `AuthModal.tsx`: Glowing inputs for signup, verification codes, and signin.
- **Dashboard (`page.tsx`)**: Controls tabs routing (Dashboard, Explore Library, Liked Songs, Playlist details) and drives instant search indexing from the local catalog.

---

## ⚠️ Errors Encountered & Solutions Applied

### 1. Windows Terminal Encoding Crashing Scripts
- **Problem**: Python scripts printed unicode emojis (✅/❌) to indicate test completions. The default CP1252 Windows console crashed on these characters.
- **Solution**: Removed emojis from terminal outputs, replacing them with alphanumeric status logs (`SUCCESS`, `FAILED`, `ERROR`).

### 2. SageMaker SDK Package Backtracking Lockup
- **Problem**: Running `pip install sagemaker` triggered infinite backtracking dependencies loops in python's package manager, locked up by clashes in `aiobotocore` versions.
- **Solution**: Decoupled SageMaker endpoint queries from the SageMaker SDK. Replaced it with native, lightweight `boto3` SageMaker-Runtime HTTP calls (`sagemaker_runtime.invoke_endpoint`), resolving all dependency locks.

### 3. API Gateway CORS preflight 401 Authorizer Rejections
- **Problem**: API Gateway returned 401 Unauthorized errors for client CORS OPTIONS requests because the routes required Cognito tokens.
- **Solution**: Updated `api_gateway.tf` to configure OPTIONS methods with Authorization `NONE` and mapped them to `MOCK` integrations returning `Access-Control-Allow-*` headers.

### 4. S3 Bucket Non-empty Destruction Failure
- **Problem**: Running `terraform destroy` failed to delete the S3 bucket because it contained residual uploaded tracks and model files, as the bucket did not have `force_destroy = true`.
- **Solution**: Ran `aws s3 rm s3://fs-music-app-assets-593927188565 --recursive` to empty the bucket prior to initiating the destroy pipeline.

### 5. SageMaker Endpoint Deletion Validation Rejection
- **Problem**: Attempting to delete the SageMaker endpoint during deployment failed with `ValidationException` because the resource was still in the `Creating` phase.
- **Solution**: Created a background monitoring daemon script [`wait_and_delete_endpoint.py`](file:///c:/fs-music-app/scripts/wait_and_delete_endpoint.py). The script ran asynchronously, polled status, waited until the endpoint failed/succeeded creation, and then successfully executed the `delete_endpoint` API call.

---

## ⚙️ Version Control & CI/CD Pipeline Configured

### 1. Root Gitignore [`c:/fs-music-app/.gitignore`](file:///c:/fs-music-app/.gitignore)
```git
# Python
venv/
__pycache__/
*.pyc
*.pyo
*.pyd
*.joblib
temp_model/
model.tar.gz

# Frontend (Node & Next.js)
frontend/node_modules/
frontend/.next/
frontend/out/
frontend/build/
.eslintcache
frontend/.env.local

# Terraform
backend/terraform/.terraform/
backend/terraform/*.tfstate*
backend/terraform/.terraform.lock.hcl
backend/terraform/terraform.tfvars

# Data files (Generated by pipelines)
data/raw/track_metadata.csv
data/raw/*.mp3
data/processed/*.mp3
data/processed/*.json

# Logs
*.log
```

### 2. GitHub Actions Pipeline [`c:/fs-music-app/.github/workflows/ci.yml`](file:///c:/fs-music-app/.github/workflows/ci.yml)
- **Frontend Job**: Verifies Node setup (v20), installs packages, and compiles the Next.js production build.
- **Backend Job**: Verifies Python setup (v3.11), checks linting bounds using `flake8`, and executes all unittest suites.
- **Terraform Job**: Verifies format bounds (`terraform fmt -check`) and validates configuration blocks (`terraform validate`).

---

## 🛠️ Verification Command Records

### 1. Build Verification
```bash
cd frontend
npm run build
```
*Result*:
```text
▲ Next.js 16.2.6 (Turbopack)
Creating an optimized production build ...
✓ Compiled successfully in 2.9s
Running TypeScript ...
Finished TypeScript in 4.1s ...
Generating static pages using 5 workers (4/4) ...
✓ Generating static pages in 802ms
Finalizing page optimization ...
```

### 2. Infrastructure Clean-Up Verification
```bash
cd backend/terraform
terraform destroy -auto-approve
```
*Result*:
```text
aws_dynamodb_table.sessions: Destruction complete after 9s
aws_dynamodb_table.playlists: Destruction complete after 9s
aws_dynamodb_table.tracks: Destruction complete after 9s
aws_dynamodb_table.users: Destruction complete after 8s
Destroy complete! Resources: 74 destroyed.
```

### 3. SageMaker Endpoint Clean-Up Verification
```bash
python scripts/wait_and_delete_endpoint.py
```
*Result*:
```text
Check 15: Endpoint Status is 'Creating'
Check 16: Endpoint Status is 'Failed'
Endpoint transitioned to 'Failed'. Deleting endpoint 'music-app-knn-endpoint'...
SUCCESS: Delete command executed successfully.
```
