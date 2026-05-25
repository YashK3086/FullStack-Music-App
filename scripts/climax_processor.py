import os
import json
import librosa
import numpy as np
import pandas as pd
import soundfile as sf
import boto3
from botocore.exceptions import NoCredentialsError

# Configuration
RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"
METADATA_CSV = os.path.join(RAW_DIR, "track_metadata.csv")
SEED_JSON = os.path.join(PROCESSED_DIR, "processed_tracks.json")
BUCKET_NAME = "fs-music-app-assets-593927188565"

os.makedirs(PROCESSED_DIR, exist_ok=True)

def calculate_climax_slice(audio_path, output_path, slice_duration=10.0):
    """
    Loads audio, finds the 10-second interval with the highest RMS energy,
    slices that interval, and writes it to output_path.
    """
    try:
        # Load audio (keep native sample rate)
        y, sr = librosa.load(audio_path, sr=None)
        
        hop_length = 512
        frame_length = 2048
        
        # Calculate frame-by-frame RMS energy
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
        
        # Calculate window size in frames for slice_duration (10 seconds)
        window_size = int((slice_duration * sr) / hop_length)
        
        if len(rms) <= window_size:
            # Song is shorter than window_size, use the whole song
            print(f"Track {audio_path} is shorter than {slice_duration}s. Using full duration.")
            slice_y = y
        else:
            # Compute rolling sum of energy
            rolling_energy = np.convolve(rms**2, np.ones(window_size), mode='valid')
            # Find index of max rolling energy (climax start)
            peak_frame_idx = np.argmax(rolling_energy)
            start_sample = peak_frame_idx * hop_length
            end_sample = start_sample + int(slice_duration * sr)
            
            slice_y = y[start_sample:end_sample]
            print(f"Track {audio_path}: climax starts at {start_sample/sr:.2f}s")
            
        # Write slice to MP3
        sf.write(output_path, slice_y, sr, format='mp3')
        print(f"SUCCESS: Sliced climax preview saved at {output_path}")
        return True
    except Exception as e:
        print(f"ERROR processing climax for {audio_path}: {e}")
        return False

def upload_to_s3(local_file, s3_key):
    """
    Optional helper to upload files to S3 once credentials and bucket are ready.
    """
    s3 = boto3.client('s3')
    try:
        s3.upload_file(local_file, BUCKET_NAME, s3_key)
        print(f"Uploaded {local_file} to s3://{BUCKET_NAME}/{s3_key}")
        return True
    except FileNotFoundError:
        print(f"Local file {local_file} not found for upload.")
        return False
    except NoCredentialsError:
        print("Credentials not available for S3 upload. Skipping.")
        return False
    except Exception as e:
        print(f"Failed to upload to S3: {e}")
        return False

def main():
    print("Starting Phase 1 climax audio processing...")
    
    # 1. Process local raw files (15 tracks)
    raw_files = sorted([f for f in os.listdir(RAW_DIR) if f.lower().endswith('.mp3') and f.startswith('Track_')])
    
    processed_previews = {}
    
    for filename in raw_files:
        # Extract track index from name (e.g. Track_001.mp3 -> 1)
        try:
            parts = filename.split('_')
            idx_str = parts[1].split('.')[0]
            track_idx = int(idx_str)
        except Exception:
            continue
            
        track_id = f"track_{track_idx:03d}"
        local_path = os.path.join(RAW_DIR, filename)
        preview_filename = f"{track_id}_preview.mp3"
        preview_path = os.path.join(PROCESSED_DIR, preview_filename)
        
        success = calculate_climax_slice(local_path, preview_path)
        if success:
            processed_previews[track_id] = {
                "local_raw": local_path,
                "local_preview": preview_path,
                "s3_raw_key": f"raw/{track_id}.mp3",
                "s3_preview_key": f"previews/{preview_filename}"
            }

    # 2. Load the metadata CSV to generate the final database seed file
    if not os.path.exists(METADATA_CSV):
        print(f"Error: metadata CSV not found at {METADATA_CSV}!")
        return
        
    df = pd.read_csv(METADATA_CSV)
    processed_tracks = []
    
    # Total tracks generated should match 500
    for _, row in df.iterrows():
        track_id = row['track_id']
        
        # Determine which real track index to map to (1 to 15)
        # e.g., track_001 -> 1, track_016 -> 1, track_500 -> 5
        try:
            val = int(track_id.split('_')[1])
            target_idx = (val - 1) % 15 + 1
        except Exception:
            target_idx = 1
            
        mapped_track_id = f"track_{target_idx:03d}"
        
        # Build S3 URLs
        # S3 URL format: https://<bucket>.s3.amazonaws.com/<key>
        s3_stream_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/raw/{mapped_track_id}.mp3"
        s3_preview_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/previews/{mapped_track_id}_preview.mp3"
        
        # Album art URL: use unique seed picsum images that resemble music covers
        album_art_url = f"https://picsum.photos/seed/{track_id}/300/300"
        
        track_item = {
            "track_id": track_id,
            "track_name": row['track_name'],
            "artist_name": row['artist_name'],
            "album_name": row['album_name'],
            "genre": row['genre'],
            "bpm": int(row['bpm']),
            "energy": float(row['energy']),
            "danceability": float(row['danceability']),
            "valence": float(row['valence']),
            "s3_stream_url": s3_stream_url,
            "s3_preview_url": s3_preview_url,
            "album_art_url": album_art_url
        }
        processed_tracks.append(track_item)
        
    # Write seed JSON file
    with open(SEED_JSON, 'w') as f:
        json.dump(processed_tracks, f, indent=2)
        
    print(f"SUCCESS: Generated DynamoDB seed JSON with {len(processed_tracks)} items at {SEED_JSON}!")

if __name__ == "__main__":
    main()
