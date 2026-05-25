import boto3
import time
from botocore.exceptions import ClientError

REGION = "us-east-1"
ENDPOINT_NAME = "music-app-knn-endpoint"

def main():
    sagemaker = boto3.client('sagemaker', region_name=REGION)
    print("Starting background wait and delete loop for SageMaker endpoint...")
    
    # 60 loops * 10 seconds = 10 minutes timeout
    for i in range(60):
        try:
            resp = sagemaker.describe_endpoint(EndpointName=ENDPOINT_NAME)
            status = resp['EndpointStatus']
            print(f"Check {i+1}: Endpoint Status is '{status}'")
            
            if status != "Creating":
                print(f"Endpoint transitioned to '{status}'. Deleting endpoint '{ENDPOINT_NAME}'...")
                sagemaker.delete_endpoint(EndpointName=ENDPOINT_NAME)
                print("SUCCESS: Delete command executed successfully.")
                return
                
        except ClientError as e:
            if "Could not find endpoint" in str(e):
                print(f"Endpoint '{ENDPOINT_NAME}' was not found. It might have been deleted. Exiting.")
                return
            else:
                print(f"AWS ClientError checking endpoint: {e}")
                
        except Exception as e:
            print(f"Unexpected error: {e}")
            
        time.sleep(10)
        
    print("TIMEOUT: Endpoint did not transition out of 'Creating' within 10 minutes.")

if __name__ == "__main__":
    main()
