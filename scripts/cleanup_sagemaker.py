import boto3
from botocore.exceptions import ClientError

REGION = "us-east-1"
ENDPOINT_NAME = "music-app-knn-endpoint"
CONFIG_NAME = "music-app-knn-config"
MODEL_NAME = "music-app-knn-model"

def cleanup():
    sagemaker = boto3.client('sagemaker', region_name=REGION)
    
    # 1. Delete Endpoint
    print(f"Attempting to delete SageMaker Endpoint: {ENDPOINT_NAME}...")
    try:
        sagemaker.delete_endpoint(EndpointName=ENDPOINT_NAME)
        print(f"SUCCESS: SageMaker Endpoint '{ENDPOINT_NAME}' deleted or deletion initiated.")
    except ClientError as e:
        if "Could not find endpoint" in str(e):
            print(f"Endpoint '{ENDPOINT_NAME}' does not exist or was already deleted.")
        else:
            print(f"Error deleting endpoint: {e}")
            
    # 2. Delete Endpoint Config
    print(f"Attempting to delete Endpoint Config: {CONFIG_NAME}...")
    try:
        sagemaker.delete_endpoint_config(EndpointConfigName=CONFIG_NAME)
        print(f"SUCCESS: Endpoint Config '{CONFIG_NAME}' deleted.")
    except ClientError as e:
        if "Could not find" in str(e):
            print(f"Config '{CONFIG_NAME}' does not exist or was already deleted.")
        else:
            print(f"Error deleting config: {e}")
            
    # 3. Delete Model
    print(f"Attempting to delete SageMaker Model: {MODEL_NAME}...")
    try:
        sagemaker.delete_model(ModelName=MODEL_NAME)
        print(f"SUCCESS: SageMaker Model '{MODEL_NAME}' deleted.")
    except ClientError as e:
        if "Could not find" in str(e):
            print(f"Model '{MODEL_NAME}' does not exist or was already deleted.")
        else:
            print(f"Error deleting model: {e}")

if __name__ == "__main__":
    cleanup()
