import os
import tarfile
import joblib
import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import MinMaxScaler
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

# Paths
RAW_DIR = "data/raw"
CSV_PATH = os.path.join(RAW_DIR, "track_metadata.csv")
MODEL_TAR = "model.tar.gz"
BUCKET_NAME = "fs-music-app-assets-593927188565"
ROLE_ARN = "arn:aws:iam::593927188565:role/SageMakerExecutionRole-MusicApp" # Will be provisioned in Terraform
REGION = "us-east-1"

INFERENCE_CODE = """import os
import joblib
import json
import numpy as np

def model_fn(model_dir):
    \"\"\"
    Load the model and scaler from the model directory.
    \"\"\"
    model_path = os.path.join(model_dir, "knn_model.joblib")
    scaler_path = os.path.join(model_dir, "scaler.joblib")
    track_ids_path = os.path.join(model_dir, "track_ids.joblib")
    
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    track_ids = joblib.load(track_ids_path)
    
    return {"model": model, "scaler": scaler, "track_ids": track_ids}

def input_fn(request_body, request_content_type):
    \"\"\"
    Parse the input request body. Expects JSON content.
    Input format: {"taste_vector": [bpm, energy, danceability, valence]}
    \"\"\"
    if request_content_type == "application/json":
        data = json.loads(request_body)
        return np.array(data["taste_vector"]).reshape(1, -1)
    else:
        raise ValueError(f"Unsupported content type: {request_content_type}")

def predict_fn(input_data, model_dict):
    \"\"\"
    Predict the nearest neighbors for the given input taste vector.
    \"\"\"
    model = model_dict["model"]
    scaler = model_dict["scaler"]
    track_ids = model_dict["track_ids"]
    
    # Scale input data using the fitted scaler
    scaled_input = scaler.transform(input_data)
    
    # Query KNN model for nearest 50 neighbors
    distances, indices = model.kneighbors(scaled_input, n_neighbors=50)
    
    # Map indices back to track IDs
    neighbor_ids = [track_ids[idx] for idx in indices[0]]
    neighbor_distances = [float(d) for d in distances[0]]
    
    return {"track_ids": neighbor_ids, "distances": neighbor_distances}

def output_fn(prediction, response_content_type):
    \"\"\"
    Format output prediction as JSON.
    \"\"\"
    if response_content_type == "application/json":
        return json.dumps(prediction)
    else:
        raise ValueError(f"Unsupported content type: {response_content_type}")
"""

def train_and_package():
    print("Training KNN Recommendation model locally...")
    
    if not os.path.exists(CSV_PATH):
        print(f"Error: metadata CSV not found at {CSV_PATH}!")
        return False
        
    df = pd.read_csv(CSV_PATH)
    
    # Extract features and track IDs
    features = ['bpm', 'energy', 'danceability', 'valence']
    X = df[features].values
    track_ids = df['track_id'].tolist()
    
    # Scale features
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Fit KNN Model
    knn = NearestNeighbors(n_neighbors=50, metric='cosine', algorithm='brute')
    knn.fit(X_scaled)
    
    # Create temp directory for saving artifacts
    temp_dir = "temp_model"
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "code"), exist_ok=True)
    
    # Save objects
    joblib.dump(knn, os.path.join(temp_dir, "knn_model.joblib"))
    joblib.dump(scaler, os.path.join(temp_dir, "scaler.joblib"))
    joblib.dump(track_ids, os.path.join(temp_dir, "track_ids.joblib"))
    
    # Write inference.py script
    with open(os.path.join(temp_dir, "code", "inference.py"), "w") as f:
        f.write(INFERENCE_CODE)
        
    # Package into model.tar.gz
    print("Packaging model artifacts into model.tar.gz...")
    with tarfile.open(MODEL_TAR, "w:gz") as tar:
        tar.add(os.path.join(temp_dir, "knn_model.joblib"), arcname="knn_model.joblib")
        tar.add(os.path.join(temp_dir, "scaler.joblib"), arcname="scaler.joblib")
        tar.add(os.path.join(temp_dir, "track_ids.joblib"), arcname="track_ids.joblib")
        tar.add(os.path.join(temp_dir, "code", "inference.py"), arcname="code/inference.py")
        
    # Clean up temp directory
    for root, dirs, files in os.walk(temp_dir, topdown=False):
        for name in files:
            os.remove(os.path.join(root, name))
        for name in dirs:
            os.rmdir(os.path.join(root, name))
    os.rmdir(temp_dir)
    
    print("SUCCESS: Model training and packaging complete. Created model.tar.gz!")
    return True

def deploy_sagemaker_endpoint():
    print(f"Deploying SageMaker Endpoint to region {REGION} using execution role {ROLE_ARN}...")
    
    s3 = boto3.client('s3', region_name=REGION)
    sagemaker = boto3.client('sagemaker', region_name=REGION)
    
    s3_key = "models/knn/model.tar.gz"
    model_s3_uri = f"s3://{BUCKET_NAME}/{s3_key}"
    
    # 1. Upload model.tar.gz to S3
    try:
        print(f"Uploading {MODEL_TAR} to {model_s3_uri}...")
        s3.upload_file(MODEL_TAR, BUCKET_NAME, s3_key)
        print("Model uploaded to S3 successfully!")
    except FileNotFoundError:
        print(f"Local file {MODEL_TAR} not found. Please train the model first.")
        return False
    except NoCredentialsError:
        print("Credentials not available for S3 upload. Cannot deploy SageMaker.")
        return False
    except Exception as e:
        print(f"Failed to upload model to S3: {e}")
        return False
        
    # 2. Deploy Model to SageMaker
    model_name = "music-app-knn-model"
    endpoint_config_name = "music-app-knn-config"
    endpoint_name = "music-app-knn-endpoint"
    
    # Scikit-learn container image URI (us-east-1 Scikit-learn 1.2-1 cpu py3)
    container_image = "683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-scikit-learn:1.2-1-cpu-py3"
    
    try:
        # Create SageMaker Model
        print(f"Creating SageMaker Model '{model_name}'...")
        try:
            sagemaker.create_model(
                ModelName=model_name,
                PrimaryContainer={
                    'Image': container_image,
                    'ModelDataUrl': model_s3_uri,
                    'Environment': {
                        'SAGEMAKER_PROGRAM': 'inference.py',
                        'SAGEMAKER_SUBMIT_DIRECTORY': model_s3_uri
                    }
                },
                ExecutionRoleArn=ROLE_ARN
            )
            print(f"SageMaker Model {model_name} created.")
        except ClientError as e:
            if "ValidationException" in str(e) and "already exists" in str(e):
                print(f"Model {model_name} already exists, skipping creation.")
            else:
                raise e
                
        # Create Endpoint Config
        print(f"Creating SageMaker Endpoint Config '{endpoint_config_name}'...")
        try:
            sagemaker.create_endpoint_config(
                EndpointConfigName=endpoint_config_name,
                ProductionVariants=[
                    {
                        'VariantName': 'AllTraffic',
                        'ModelName': model_name,
                        'InitialInstanceCount': 1,
                        'InstanceType': 'ml.t2.medium', # Cost-efficient instance
                    }
                ]
            )
            print(f"Endpoint Config {endpoint_config_name} created.")
        except ClientError as e:
            if "ValidationException" in str(e) and "already exists" in str(e):
                print(f"Endpoint Config {endpoint_config_name} already exists, skipping creation.")
            else:
                raise e
                
        # Create Endpoint
        print(f"Creating SageMaker Endpoint '{endpoint_name}' (this may take 3-5 minutes)...")
        try:
            sagemaker.create_endpoint(
                EndpointName=endpoint_name,
                EndpointConfigName=endpoint_config_name
            )
            print(f"Endpoint creation initiated for '{endpoint_name}'.")
        except ClientError as e:
            if "ValidationException" in str(e) and "already exists" in str(e):
                print(f"Endpoint {endpoint_name} already exists.")
            else:
                raise e
                
        # Describe Endpoint to show status
        resp = sagemaker.describe_endpoint(EndpointName=endpoint_name)
        print(f"Endpoint Status: {resp['EndpointStatus']}")
        print("Note: SageMaker endpoints take several minutes to transition to 'InService'. Check status via AWS Console or CLI.")
        return True
        
    except ClientError as e:
        print(f"SageMaker Deployment ClientError: {e}")
        return False
    except Exception as e:
        print(f"SageMaker Deployment failed: {e}")
        return False

if __name__ == "__main__":
    import sys
    # Always train and package
    success = train_and_package()
    if success and len(sys.argv) > 1 and sys.argv[1] == "--deploy":
        deploy_sagemaker_endpoint()
