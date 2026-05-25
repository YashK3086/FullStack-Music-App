import pandas as pd

data = {
    "track_id": [f"track_{i:03d}" for i in range(1, 11)],
    "track_name": [
        "Midnight City Ride", "Heavy Lifting", "Deep Focus Beat", "Summer House Vibe", "Metal Shredder",
        "Lo-Fi Rain drops", "Gym Hype Phonk", "Acoustic Morning", "Synthwave Horizon", "Cardio Blast"
    ],
    "artist_name": [
        "Neon Driver", "Iron Crew", "The Scholar", "DJ Sunshine", "Anvil Fury",
        "Coffee & Cloud", "Slayer Phonk", "Emma Woods", "Retro Kid", "Pulse Master"
    ],
    "album_name": [
        "Neon Drive", "No Pain No Gain", "Library Session", "Ibiza Mix", "Forged in Fire",
        "Chill Beats Vol 1", "Drift Protocol", "Woodland", "Future Nostalgia", "Max Heartrate"
    ],
    "genre": [
        "Synthwave", "Gym-Rock", "Lo-Fi", "EDM", "Metal",
        "Lo-Fi", "Gym-Phonk", "Acoustic", "Synthwave", "EDM"
    ],
    "bpm": [115, 140, 75, 126, 160, 80, 150, 90, 110, 132],
    "energy": [0.75, 0.92, 0.21, 0.85, 0.98, 0.15, 0.95, 0.35, 0.68, 0.89],
    "danceability": [0.68, 0.50, 0.40, 0.78, 0.32, 0.62, 0.80, 0.55, 0.72, 0.82],
    "valence": [0.60, 0.45, 0.30, 0.80, 0.20, 0.50, 0.65, 0.70, 0.55, 0.75]
}

df = pd.DataFrame(data)
df.to_csv("data/raw/track_metadata.csv", index=False)
print("✅ Seed dataset generated successfully at data/raw/track_metadata.csv!")