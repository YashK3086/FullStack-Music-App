import json
import os
import random
import boto3
from botocore.exceptions import ClientError
from decimal import Decimal

# Table Names
TRACKS_TABLE = os.environ.get("TRACKS_TABLE", "fs-music-app-tracks")
USERS_TABLE = os.environ.get("USERS_TABLE", "fs-music-app-users")
SESSIONS_TABLE = os.environ.get("SESSIONS_TABLE", "fs-music-app-sessions")
SAGEMAKER_ENDPOINT = os.environ.get("SAGEMAKER_ENDPOINT", "music-app-knn-endpoint")

dynamodb = boto3.resource("dynamodb")
tracks_table = dynamodb.Table(TRACKS_TABLE)
users_table = dynamodb.Table(USERS_TABLE)
sessions_table = dynamodb.Table(SESSIONS_TABLE)

sagemaker_runtime = boto3.client("sagemaker-runtime")

def get_response(status_code, body):
    # Convert Decimals in body to floats/ints recursively for JSON serialization
    clean_body = json.loads(json.dumps(body, default=decimal_serializer))
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        "body": json.dumps(clean_body)
    }

def decimal_serializer(obj):
    if isinstance(obj, Decimal):
        return float(obj) if obj % 1 != 0 else int(obj)
    raise TypeError("Type not serializable")

def get_fallback_tracks():
    """
    Fallback Layer: Scans a sample of tracks from the DB if SageMaker endpoint
    is cold, throws an error, or the user has no history.
    """
    print("Executing fallback recommendation layer...")
    try:
        # Scan 40 items and pick 15 random ones
        resp = tracks_table.scan(Limit=40)
        items = resp.get("Items", [])
        if len(items) > 15:
            items = random.sample(items, 15)
        return items
    except Exception as e:
        print(f"Error fetching fallback tracks: {e}")
        return []

def handler(event, context):
    print("Received event:", json.dumps(event))
    
    # Extract authorized user ID
    authorizer = event.get("requestContext", {}).get("authorizer", {})
    user_id = authorizer.get("claims", {}).get("sub")
    
    if not user_id:
        user_id = event.get("headers", {}).get("x-user-id", "mock-test-user-id")
        
    try:
        # 1. Check if focus session is active for the user
        session_active = False
        try:
            session_resp = sessions_table.get_item(Key={"user_id": user_id})
            if "Item" in session_resp:
                session = session_resp["Item"]
                # Verify TTL is still active
                if session.get("is_focus_mode") and session.get("focus_context") == "gym":
                    session_active = True
        except Exception as se:
            print(f"Session query failed: {se}. Defaulting to standard mode.")
            
        # 2. GYM MODE ACTIVE: Retrieve high-energy tracks
        if session_active:
            print(f"Gym Session is ACTIVE for user {user_id}. Querying high-energy tracks...")
            # Target rows where Energy > 0.8, BPM > 120, and fast-tempo genres (EDM, Rock, Phonk, Metal, Pop)
            # In DynamoDB, scan with filter expression
            resp = tracks_table.scan(
                FilterExpression="bpm >= :bpm AND energy >= :energy",
                ExpressionAttributeValues={
                    ":bpm": 120,
                    ":energy": Decimal("0.8")
                }
            )
            gym_tracks = resp.get("Items", [])
            
            # Filter specifically against fast-tempo genres in memory
            fast_genres = ["EDM", "Gym-Rock", "Metal", "Gym-Phonk", "Pop", "Synthwave", "Hip-Hop"]
            filtered_gym_tracks = [t for t in gym_tracks if t.get("genre") in fast_genres]
            
            # Fallback to general scan if filtered list is too small
            if len(filtered_gym_tracks) < 10:
                filtered_gym_tracks = gym_tracks
                
            # Randomize and return top 15
            if len(filtered_gym_tracks) > 15:
                filtered_gym_tracks = random.sample(filtered_gym_tracks, 15)
                
            # Compile discovered lists
            trending_albums = list(set([t.get("album_name") for t in filtered_gym_tracks if t.get("album_name")]))[:5]
            discovered_artists = list(set([t.get("artist_name") for t in filtered_gym_tracks if t.get("artist_name")]))[:5]
            
            return get_response(200, {
                "context": "gym_mode",
                "recommendations": filtered_gym_tracks,
                "trending_albums": trending_albums,
                "discovered_artists": discovered_artists
            })
            
        # 3. GYM MODE INACTIVE: Personalized KNN Recommendations
        print(f"Gym Session is INACTIVE for user {user_id}. Executing personalized recommendations...")
        
        user_resp = users_table.get_item(Key={"user_id": user_id})
        if "Item" not in user_resp:
            # First time user, no history, trigger Fallback
            print(f"User {user_id} profile not found. Triggering fallback.")
            fallback_tracks = get_fallback_tracks()
            return get_response(200, {
                "context": "fallback_new_user",
                "recommendations": fallback_tracks,
                "trending_albums": ["Top Hits", "Chill Vibes"],
                "discovered_artists": ["New Talent"]
            })
            
        user = user_resp["Item"]
        play_history = user.get("play_history", [])
        genre_affinity = user.get("genre_affinity", {})
        artist_affinity = user.get("artist_affinity", {})
        
        # If user has no play history, trigger fallback
        if not play_history:
            print("User play history is empty. Triggering fallback.")
            fallback_tracks = get_fallback_tracks()
            return get_response(200, {
                "context": "fallback_no_history",
                "recommendations": fallback_tracks,
                "trending_albums": ["Top Hits", "Chill Vibes"],
                "discovered_artists": ["New Talent"]
            })
            
        # Extract last 5 tracks from history
        last_5_history = play_history[-5:]
        track_ids = [item.get("track_id") for item in last_5_history]
        
        # Fetch metadata for these tracks
        bpm_values = []
        energy_values = []
        danceability_values = []
        valence_values = []
        
        for tid in track_ids:
            t_resp = tracks_table.get_item(Key={"track_id": tid})
            if "Item" in t_resp:
                t = t_resp["Item"]
                bpm_values.append(float(t.get("bpm", 100)))
                energy_values.append(float(t.get("energy", 0.5)))
                danceability_values.append(float(t.get("danceability", 0.5)))
                valence_values.append(float(t.get("valence", 0.5)))
                
        # If we failed to get metadata for any track, trigger fallback
        if not bpm_values:
            print("Failed to load metadata for history tracks. Triggering fallback.")
            fallback_tracks = get_fallback_tracks()
            return get_response(200, {
                "context": "fallback_metadata_error",
                "recommendations": fallback_tracks,
                "trending_albums": [],
                "discovered_artists": []
            })
            
        # Calculate taste vector
        avg_bpm = sum(bpm_values) / len(bpm_values)
        avg_energy = sum(energy_values) / len(energy_values)
        avg_danceability = sum(danceability_values) / len(danceability_values)
        avg_valence = sum(valence_values) / len(valence_values)
        
        taste_vector = [avg_bpm, avg_energy, avg_danceability, avg_valence]
        print(f"Calculated User Taste Vector: {taste_vector}")
        
        # Invoke SageMaker Endpoint with Error Boundary
        try:
            print(f"Invoking SageMaker endpoint '{SAGEMAKER_ENDPOINT}'...")
            payload = {"taste_vector": taste_vector}
            
            sm_resp = sagemaker_runtime.invoke_endpoint(
                EndpointName=SAGEMAKER_ENDPOINT,
                ContentType="application/json",
                Body=json.dumps(payload)
            )
            
            result = json.loads(sm_resp["Body"].read().decode())
            candidate_ids = result.get("track_ids", [])
            distances = result.get("distances", [])
            print(f"SageMaker returned {len(candidate_ids)} candidates.")
            
        except Exception as sme:
            # Sagemaker Endpoint Error Boundary
            print(f"SageMaker Endpoint Exception: {sme}. Recovering via fallback layer...")
            fallback_tracks = get_fallback_tracks()
            return get_response(200, {
                "context": "fallback_sagemaker_error",
                "recommendations": fallback_tracks,
                "trending_albums": ["Top Hits", "Retro Hits"],
                "discovered_artists": ["Indie Artist"]
            })
            
        # 4. Multi-Stage Scoring and Novelty Boost
        scored_candidates = []
        for i, cid in enumerate(candidate_ids):
            # Fetch candidate details
            c_resp = tracks_table.get_item(Key={"track_id": cid})
            if "Item" not in c_resp:
                continue
                
            track = c_resp["Item"]
            distance = distances[i]
            # Since distance is cosine distance, similarity is 1 - distance
            similarity = 1.0 - distance
            
            # Extract affinity weights
            genre = track.get("genre", "")
            artist = track.get("artist_name", "")
            
            genre_wt = float(genre_affinity.get(genre, 0.0))
            artist_wt = float(artist_affinity.get(artist, 0.0))
            
            # Formula: Score = (Similarity * 0.5) + (Genre Affinity * 0.3) + (Artist Affinity * 0.2)
            score = (similarity * 0.5) + (genre_wt * 0.3) + (artist_wt * 0.2)
            
            # Novelty Boost: 20% boost to target genres from new artists not in artist_affinity
            is_new_artist = artist not in artist_affinity
            target_genres = ["EDM", "Synthwave", "Gym-Rock", "Lo-Fi", "Metal", "Gym-Phonk", "Acoustic", "Hip-Hop", "Pop"]
            
            if is_new_artist and genre in target_genres:
                score = score * 1.2
                track["novelty_boosted"] = True
                
            scored_candidates.append({
                "track": track,
                "score": score
            })
            
        # Sort candidates by score descending
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        top_recommendations = [item["track"] for item in scored_candidates[:15]]
        
        # If scored candidates is empty (e.g. DynamoDB lookup failed), use fallback
        if not top_recommendations:
            top_recommendations = get_fallback_tracks()
            
        # Extract metadata outputs
        trending_albums = list(set([t.get("album_name") for t in top_recommendations if t.get("album_name")]))[:5]
        discovered_artists = list(set([t.get("artist_name") for t in top_recommendations if t.get("novelty_boosted") and t.get("artist_name")]))[:5]
        
        # If discovered artists is empty, fill with standard artist suggestions
        if not discovered_artists:
            discovered_artists = list(set([t.get("artist_name") for t in top_recommendations if t.get("artist_name")]))[:3]
            
        return get_response(200, {
            "context": "personalized",
            "recommendations": top_recommendations,
            "trending_albums": trending_albums,
            "discovered_artists": discovered_artists
        })
        
    except Exception as e:
        print(f"Critical Recommendations Handler Error: {e}")
        fallback_tracks = get_fallback_tracks()
        return get_response(200, {
            "context": "fallback_critical_error",
            "recommendations": fallback_tracks,
            "trending_albums": [],
            "discovered_artists": []
        })
