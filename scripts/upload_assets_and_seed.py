import os
import json
import boto3
from botocore.exceptions import ClientError

# Configuration
RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"
SEED_JSON = os.path.join(PROCESSED_DIR, "processed_tracks.json")
BUCKET_NAME = "fs-music-app-assets-593927188565"
TABLE_NAME = "fs-music-app-tracks"
REGION = "us-east-1"

def upload_audio_to_s3():
    s3 = boto3.client('s3', region_name=REGION)
    
    print("Uploading raw and preview audio files to S3 bucket...")
    
    # 1. Upload the 15 raw tracks
    for idx in range(1, 16):
        filename = f"Track_{idx:03d}.mp3"
        local_path = os.path.join(RAW_DIR, filename)
        s3_key = f"raw/track_{idx:03d}.mp3"
        
        if os.path.exists(local_path):
            try:
                print(f"Uploading {local_path} to s3://{BUCKET_NAME}/{s3_key}...")
                s3.upload_file(local_path, BUCKET_NAME, s3_key)
            except Exception as e:
                print(f"Failed to upload raw track {idx}: {e}")
        else:
            print(f"Raw track {local_path} not found!")

    # 2. Upload the 15 sliced previews
    for idx in range(1, 16):
        filename = f"track_{idx:03d}_preview.mp3"
        local_path = os.path.join(PROCESSED_DIR, filename)
        s3_key = f"previews/{filename}"
        
        if os.path.exists(local_path):
            try:
                print(f"Uploading {local_path} to s3://{BUCKET_NAME}/{s3_key}...")
                s3.upload_file(local_path, BUCKET_NAME, s3_key)
            except Exception as e:
                print(f"Failed to upload preview {idx}: {e}")
        else:
            print(f"Preview track {local_path} not found!")

    print("SUCCESS: Audio files uploaded to S3!")

def seed_dynamodb():
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)
    
    if not os.path.exists(SEED_JSON):
        print(f"Error: Seed file {SEED_JSON} not found!")
        return
        
    with open(SEED_JSON, 'r') as f:
        tracks = json.load(f)
        
    print(f"Seeding {len(tracks)} tracks to DynamoDB table '{TABLE_NAME}'...")
    
    # Batch write items in chunks of 25 (DynamoDB maximum batch size)
    batch_size = 25
    for i in range(0, len(tracks), batch_size):
        chunk = tracks[i:i + batch_size]
        try:
            with table.batch_writer() as batch:
                for track in chunk:
                    # Construct item attributes matching schema
                    item = {
                        "track_id": track["track_id"],
                        "track_name": track["track_name"],
                        "artist_name": track["artist_name"],
                        "album_name": track["album_name"],
                        "genre": track["genre"],
                        "bpm": int(track["bpm"]),
                        "energy": boto3.dynamodb.types.Decimal(str(track["energy"])),
                        "danceability": boto3.dynamodb.types.Decimal(str(track["danceability"])),
                        "valence": boto3.dynamodb.types.Decimal(str(track["valence"])),
                        "s3_stream_url": track["s3_stream_url"],
                        "s3_preview_url": track["s3_preview_url"],
                        "album_art_url": track["album_art_url"]
                    }
                    batch.put_item(Item=item)
            print(f"Seeded batch {i // batch_size + 1}/{len(tracks) // batch_size + 1}...")
        except Exception as e:
            print(f"Error seeding batch starting at index {i}: {e}")
            
    print("SUCCESS: DynamoDB seeding complete!")

if __name__ == "__main__":
    upload_audio_to_s3()
    seed_dynamodb()
