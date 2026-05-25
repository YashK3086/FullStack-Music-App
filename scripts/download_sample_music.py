import os
import requests
import pandas as pd
import random
import shutil

# Paths
RAW_DIR = "data/raw"
CSV_PATH = os.path.join(RAW_DIR, "track_metadata.csv")

# Create directories if they do not exist
os.makedirs(RAW_DIR, exist_ok=True)

# List of sample URLs (SoundHelix has stable, public example tracks)
SAMPLE_URLS = [
    ("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "Track_008.mp3"),
    ("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", "Track_009.mp3"),
    ("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", "Track_010.mp3"),
    ("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", "Track_011.mp3"),
    ("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", "Track_012.mp3"),
]

def download_file(url, dest_path):
    try:
        print(f"Downloading {url} to {dest_path}...")
        response = requests.get(url, stream=True, timeout=15)
        if response.status_code == 200:
            with open(dest_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
            print(f"SUCCESS: Downloaded {dest_path} successfully!")
            return True
        else:
            print(f"FAILED: Failed to download from {url} (Status: {response.status_code})")
            return False
    except Exception as e:
        print(f"ERROR: Error downloading {url}: {e}")
        return False

# 1. Download extra tracks to supplement raw audio
downloaded_count = 0
for url, filename in SAMPLE_URLS:
    dest = os.path.join(RAW_DIR, filename)
    if os.path.exists(dest):
        print(f"File {filename} already exists, skipping download.")
        downloaded_count += 1
    else:
        success = download_file(url, dest)
        if success:
            downloaded_count += 1

# If downloads fail or to ensure we have at least 15 tracks, duplicate/copy existing files
existing_files = [f for f in os.listdir(RAW_DIR) if f.lower().endswith('.mp3')]
print(f"Current MP3 files in {RAW_DIR}: {existing_files}")

target_raw_count = 15
if len(existing_files) < target_raw_count:
    print(f"Only have {len(existing_files)} files. Copying existing files to reach target {target_raw_count} files...")
    idx = len(existing_files) + 1
    while idx <= target_raw_count:
        src_file = random.choice(existing_files)
        dest_filename = f"Track_{idx:03d}.mp3"
        src_path = os.path.join(RAW_DIR, src_file)
        dest_path = os.path.join(RAW_DIR, dest_filename)
        shutil.copyfile(src_path, dest_path)
        print(f"Copied {src_file} -> {dest_filename}")
        idx += 1

# Update listing of actual raw tracks
final_files = sorted([f for f in os.listdir(RAW_DIR) if f.lower().endswith('.mp3')])
print(f"Final audio catalog has {len(final_files)} tracks: {final_files}")

# 2. Generate CSV for 500 tracks
print("Generating 500-track metadata dataset...")

genres = ["Synthwave", "Gym-Rock", "Lo-Fi", "EDM", "Metal", "Gym-Phonk", "Acoustic", "Hip-Hop", "Pop", "Jazz"]
track_words = ["City", "Morning", "Night", "Shadow", "Neon", "Horizon", "Climax", "Beat", "Focus", "Chilled", "Hype", "Heavy", "Drift", "Future", "Slayer", "Forest", "Rain", "Sun", "Pulse", "Vibe"]
artist_prefixes = ["DJ", "Neon", "Retro", "Iron", "Anvil", "Slayer", "Coffee", "Pulse", "Deep", "Chill"]
artist_suffixes = ["Sunshine", "Driver", "Crew", "Fury", "Phonk", "Cloud", "Master", "Kid", "Scholar", "Project"]
album_types = ["Vibes", "Session", "Drive", "Vol 1", "Mix", "Fire", "Nostalgia", "Protocol", "Morning", "Infinity"]

tracks_data = []

# Generate 500 items
for i in range(1, 501):
    track_id = f"track_{i:03d}"
    
    # Generate names
    track_name = f"{random.choice(track_words)} {random.choice(track_words)}"
    artist_name = f"{random.choice(artist_prefixes)} {random.choice(artist_suffixes)}"
    album_name = f"{random.choice(track_words)} {random.choice(album_types)}"
    
    # Pick a genre
    genre = random.choice(genres)
    
    # Energy, BPM, valence, danceability distributions based on genre
    if genre == "Gym-Rock" or genre == "Metal" or genre == "Gym-Phonk" or genre == "EDM":
        # High BPM, High Energy
        bpm = random.randint(120, 175)
        energy = round(random.uniform(0.75, 0.99), 2)
        danceability = round(random.uniform(0.50, 0.85), 2)
        valence = round(random.uniform(0.15, 0.70), 2)
    elif genre == "Lo-Fi" or genre == "Jazz" or genre == "Acoustic":
        # Low BPM, Low Energy
        bpm = random.randint(65, 95)
        energy = round(random.uniform(0.10, 0.40), 2)
        danceability = round(random.uniform(0.35, 0.65), 2)
        valence = round(random.uniform(0.30, 0.75), 2)
    else:
        # Standard pop/synthwave/hip-hop
        bpm = random.randint(90, 130)
        energy = round(random.uniform(0.40, 0.80), 2)
        danceability = round(random.uniform(0.60, 0.90), 2)
        valence = round(random.uniform(0.40, 0.85), 2)

    tracks_data.append({
        "track_id": track_id,
        "track_name": track_name,
        "artist_name": artist_name,
        "album_name": album_name,
        "genre": genre,
        "bpm": bpm,
        "energy": energy,
        "danceability": danceability,
        "valence": valence
    })

df = pd.DataFrame(tracks_data)
df.to_csv(CSV_PATH, index=False)
print(f"SUCCESS: Generated metadata CSV with {len(df)} tracks at {CSV_PATH}!")
