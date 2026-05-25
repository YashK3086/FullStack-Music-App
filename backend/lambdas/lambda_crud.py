import json
import os
import uuid
import time
import boto3
from botocore.exceptions import ClientError

# Table Names
USERS_TABLE = os.environ.get("USERS_TABLE", "fs-music-app-users")
PLAYLISTS_TABLE = os.environ.get("PLAYLISTS_TABLE", "fs-music-app-playlists")

dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table(USERS_TABLE)
playlists_table = dynamodb.Table(PLAYLISTS_TABLE)

def get_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        "body": json.dumps(body)
    }

def ensure_user_exists(user_id, claims):
    """
    Checks if a user exists in the Users table; if not, creates the profile.
    """
    try:
        resp = users_table.get_item(Key={"user_id": user_id})
        if "Item" not in resp:
            username = claims.get("cognito:username", claims.get("email", "unknown"))
            email = claims.get("email", "")
            users_table.put_item(
                Item={
                    "user_id": user_id,
                    "username": username,
                    "email": email,
                    "genre_affinity": {},
                    "artist_affinity": {},
                    "liked_tracks": [],
                    "play_history": []
                }
            )
            print(f"Created new user profile for user_id: {user_id}")
    except Exception as e:
        print(f"Error ensuring user exists: {e}")

def handler(event, context):
    print("Received event:", json.dumps(event))
    
    # Extract HTTP info
    http_method = event.get("httpMethod")
    resource = event.get("resource")
    path_parameters = event.get("pathParameters") or {}
    
    # Extract authorized user ID
    authorizer = event.get("requestContext", {}).get("authorizer", {})
    claims = authorizer.get("claims", {})
    user_id = claims.get("sub")
    
    if not user_id:
        # Fallback for local testing or unauthenticated requests
        user_id = event.get("headers", {}).get("x-user-id", "mock-test-user-id")
        claims = {"email": "test@example.com", "cognito:username": "testuser"}
        
    ensure_user_exists(user_id, claims)
    
    try:
        # --- Route: /playlists (GET / POST) ---
        if resource == "/playlists":
            if http_method == "GET":
                # List playlists owned by this user
                # GSI is preferred, but simple scan with filter works for dev
                resp = playlists_table.scan(
                    FilterExpression="user_id = :uid",
                    ExpressionAttributeValues={":uid": user_id}
                )
                playlists = resp.get("Items", [])
                return get_response(200, playlists)
                
            elif http_method == "POST":
                # Create a playlist
                body = json.loads(event.get("body") or "{}")
                name = body.get("name")
                track_ids = body.get("track_ids", [])
                
                if not name:
                    return get_response(400, {"error": "Playlist name is required"})
                    
                playlist_id = str(uuid.uuid4())
                now = str(int(time.time()))
                
                item = {
                    "playlist_id": playlist_id,
                    "name": name,
                    "user_id": user_id,
                    "track_ids": track_ids,
                    "created_at": now,
                    "updated_at": now
                }
                playlists_table.put_item(Item=item)
                return get_response(201, item)
                
        # --- Route: /playlists/{playlist_id} (PUT / DELETE) ---
        elif resource == "/playlists/{playlist_id}":
            playlist_id = path_parameters.get("playlist_id")
            if not playlist_id:
                return get_response(400, {"error": "playlist_id is required"})
                
            # Fetch playlist first to check ownership
            resp = playlists_table.get_item(Key={"playlist_id": playlist_id})
            if "Item" not in resp:
                return get_response(404, {"error": "Playlist not found"})
                
            playlist = resp["Item"]
            if playlist.get("user_id") != user_id:
                return get_response(403, {"error": "You do not own this playlist"})
                
            if http_method == "PUT":
                body = json.loads(event.get("body") or "{}")
                name = body.get("name", playlist.get("name"))
                track_ids = body.get("track_ids", playlist.get("track_ids", []))
                
                now = str(int(time.time()))
                
                playlists_table.update_item(
                    Key={"playlist_id": playlist_id},
                    UpdateExpression="SET #n = :n, track_ids = :t, updated_at = :u",
                    ExpressionAttributeNames={"#n": "name"},
                    ExpressionAttributeValues={
                        ":n": name,
                        ":t": track_ids,
                        ":u": now
                    }
                )
                
                playlist["name"] = name
                playlist["track_ids"] = track_ids
                playlist["updated_at"] = now
                return get_response(200, playlist)
                
            elif http_method == "DELETE":
                playlists_table.delete_item(Key={"playlist_id": playlist_id})
                return get_response(200, {"message": f"Playlist {playlist_id} deleted successfully"})
                
        # --- Route: /tracks/favorite (POST) ---
        elif resource == "/tracks/favorite":
            if http_method == "POST":
                body = json.loads(event.get("body") or "{}")
                track_id = body.get("track_id")
                
                if not track_id:
                    return get_response(400, {"error": "track_id is required"})
                    
                # Get current user liked tracks
                resp = users_table.get_item(Key={"user_id": user_id})
                user = resp["Item"]
                liked_tracks = user.get("liked_tracks", [])
                
                if track_id in liked_tracks:
                    # Remove from favorites
                    liked_tracks.remove(track_id)
                    action = "removed"
                else:
                    # Add to favorites
                    liked_tracks.append(track_id)
                    action = "added"
                    
                users_table.update_item(
                    Key={"user_id": user_id},
                    UpdateExpression="SET liked_tracks = :l",
                    ExpressionAttributeValues={":l": liked_tracks}
                )
                
                return get_response(200, {
                    "action": action,
                    "track_id": track_id,
                    "liked_tracks": liked_tracks
                })
                
        # --- Route: /tracks/play (POST) ---
        elif resource == "/tracks/play":
            if http_method == "POST":
                body = json.loads(event.get("body") or "{}")
                track_id = body.get("track_id")
                
                if not track_id:
                    return get_response(400, {"error": "track_id is required"})
                    
                # Fetch track to get genre and artist
                tracks_table = dynamodb.Table(os.environ.get("TRACKS_TABLE", "fs-music-app-tracks"))
                t_resp = tracks_table.get_item(Key={"track_id": track_id})
                if "Item" not in t_resp:
                    return get_response(404, {"error": "Track not found"})
                    
                track = t_resp["Item"]
                genre = track.get("genre", "")
                artist = track.get("artist_name", "")
                
                # Fetch user profile
                u_resp = users_table.get_item(Key={"user_id": user_id})
                user = u_resp["Item"]
                
                # Update play history
                play_history = user.get("play_history", [])
                play_history.append({"track_id": track_id, "played_at": str(int(time.time()))})
                
                # Limit history to 20 items to prevent row bloat
                if len(play_history) > 20:
                    play_history = play_history[-20:]
                    
                # Update genre affinity (increment by 0.1, max 1.0)
                genre_affinity = user.get("genre_affinity", {})
                current_g_wt = float(genre_affinity.get(genre, 0.0))
                genre_affinity[genre] = str(min(1.0, current_g_wt + 0.1))
                
                # Update artist affinity (increment by 0.1, max 1.0)
                artist_affinity = user.get("artist_affinity", {})
                current_a_wt = float(artist_affinity.get(artist, 0.0))
                artist_affinity[artist] = str(min(1.0, current_a_wt + 0.1))
                
                users_table.update_item(
                    Key={"user_id": user_id},
                    UpdateExpression="SET play_history = :h, genre_affinity = :g, artist_affinity = :a",
                    ExpressionAttributeValues={
                        ":h": play_history,
                        ":g": genre_affinity,
                        ":a": artist_affinity
                    }
                )
                
                return get_response(200, {
                    "message": "Track play recorded",
                    "track_id": track_id,
                    "play_history_length": len(play_history)
                })
                
        return get_response(404, {"error": "Resource not found"})
        
    except ClientError as e:
        print(f"DynamoDB ClientError: {e}")
        return get_response(500, {"error": "Database error", "details": str(e)})
    except Exception as e:
        print(f"Server Error: {e}")
        return get_response(500, {"error": "Server error", "details": str(e)})
