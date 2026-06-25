# n8n MLOps Automation Setup Guide

This directory contains the Docker and workflow configuration needed to host and run the automated **SageMaker KNN Model Retraining and Endpoint Lifecycle** pipeline.

---

## 🚀 Step 1: Spin up n8n Locally

n8n is containerized using Docker. To spin up your n8n workspace:

1. Open your terminal and navigate to this folder:
   ```bash
   cd backend/n8n
   ```
2. Start the container in the background:
   ```bash
   docker compose up -d
   ```
3. Open your browser and navigate to:
   * **[http://localhost:5678](http://localhost:5678)**
4. Follow the on-screen steps to create your initial admin account.

---

## 📥 Step 2: Import the MLOps Workflow

1. In the n8n sidebar, click on **Workflows** and select **+ New workflow**.
2. Click the **three dots menu (⋮)** in the top right corner.
3. Click **Import from file**.
4. Select **[`sagemaker_mlops_workflow.json`](file:///c:/fs-music-app/backend/n8n/sagemaker_mlops_workflow.json)** from this directory.
5. The visual workspace will automatically render the entire training, polling, traffic-routing, and cleanup workflow!

---

## 🔑 Step 3: Configure AWS Credentials

The workflow interacts directly with AWS Lambda and SageMaker using two AWS nodes. To authenticate n8n with AWS:

1. In the n8n sidebar, navigate to **Credentials**.
2. Click **Add Credential** and search for **AWS**.
3. Create a credential of type **AWS Credentials**.
4. Enter your details:
   * **Access Key ID**: Your AWS Access Key.
   * **Secret Access Key**: Your AWS Secret Access Key.
   * **Region**: `us-east-1` (or your active AWS region).
5. Name the credential **`AWS Account Credentials`** (so it matches the pre-configured workflow binding).

---

## 🔔 Step 4: Configure Webhooks & Activate

1. Double-click the **Discord Webhook Notification** and **Discord Error Notification** nodes inside the workflow.
2. Replace `https://discord.com/api/webhooks/YOUR_MOCK_DISCORD_WEBHOOK_URL` with your actual Discord or Slack webhook URL.
3. In the top right corner of the workflow editor, toggle the **Active** switch to **ON**. 

Your SageMaker model will now retrain automatically every Sunday at 3:00 AM! You can also trigger it manually at any time by making a POST request to your local n8n webhook:
```bash
curl -X POST http://localhost:5678/webhook/sagemaker-retrain
```
