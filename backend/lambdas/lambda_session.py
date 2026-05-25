import json
import os
import time
import boto3
from botocore.exceptions import ClientError

# Table Name
SESSIONS_TABLE = os.environ.get("SESSIONS_TABLE", "fs-music-app-sessions")

dynamodb = boto3.resource("dynamodb")
sessions_table = dynamodb.Table(SESSIONS_TABLE)

def get_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        "body": json.dumps(body)
    }

def handler(event, context):
    print("Received event:", json.dumps(event))
    
    http_method = event.get("httpMethod")
    resource = event.get("resource")
    
    # Extract authorized user ID
    authorizer = event.get("requestContext", {}).get("authorizer", {})
    user_id = authorizer.get("claims", {}).get("sub")
    
    if not user_id:
        user_id = event.get("headers", {}).get("x-user-id", "mock-test-user-id")
        
    try:
        if resource == "/session/start" and http_method == "POST":
            body = json.loads(event.get("body") or "{}")
            is_focus_mode = body.get("is_focus_mode", True)
            focus_context = body.get("focus_context", "gym")
            
            # Calculate TTL: exactly 3600 seconds (1 hour) in the future
            ttl_timestamp = int(time.time()) + 3600
            
            session_item = {
                "user_id": user_id,
                "is_focus_mode": is_focus_mode,
                "focus_context": focus_context,
                "ttl_timestamp": ttl_timestamp
            }
            
            sessions_table.put_item(Item=session_item)
            
            return get_response(200, {
                "message": "Focus session started successfully",
                "session": session_item
            })
            
        return get_response(404, {"error": "Resource not found"})
        
    except ClientError as e:
        print(f"DynamoDB ClientError: {e}")
        return get_response(500, {"error": "Database error", "details": str(e)})
    except Exception as e:
        print(f"Server Error: {e}")
        return get_response(500, {"error": "Server error", "details": str(e)})
