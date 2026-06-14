import unittest
import sys
import os
import json
import time
from unittest.mock import MagicMock, patch
from decimal import Decimal

# Add path for importing lambdas
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend", "lambdas"))

# Import Lambda handlers
import lambda_crud
import lambda_session
import lambda_recommendations

class TestMusicAppBackend(unittest.TestCase):

    def setUp(self):
        # Reset tables mock state
        self.mock_dynamodb = MagicMock()
        lambda_crud.dynamodb = self.mock_dynamodb
        lambda_session.dynamodb = self.mock_dynamodb
        lambda_recommendations.dynamodb = self.mock_dynamodb

    @patch('lambda_crud.playlists_table')
    @patch('lambda_crud.users_table')
    def test_crud_create_playlist(self, mock_users, mock_playlists):
        # Setup mock user exists get_item
        mock_users.get_item.return_value = {"Item": {"user_id": "test-user-1"}}
        
        # Mock event
        event = {
            "httpMethod": "POST",
            "resource": "/playlists",
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "sub": "test-user-1",
                        "email": "test@example.com"
                    }
                }
            },
            "body": json.dumps({
                "name": "Heavy Shreds",
                "track_ids": ["track_005", "track_008"]
            })
        }
        
        # Invoke handler
        response = lambda_crud.handler(event, None)
        self.assertEqual(response["statusCode"], 201)
        
        body = json.loads(response["body"])
        self.assertEqual(body["name"], "Heavy Shreds")
        self.assertEqual(body["user_id"], "test-user-1")
        self.assertEqual(len(body["track_ids"]), 2)
        
        # Verify DynamoDB put_item was called
        mock_playlists.put_item.assert_called_once()

    @patch('lambda_session.sessions_table')
    def test_session_start_ttl(self, mock_sessions):
        # Mock event
        event = {
            "httpMethod": "POST",
            "resource": "/session/start",
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "sub": "test-user-1"
                    }
                }
            },
            "body": json.dumps({
                "is_focus_mode": True,
                "focus_context": "gym"
            })
        }
        
        # Invoke handler
        now = int(time.time())
        response = lambda_session.handler(event, None)
        self.assertEqual(response["statusCode"], 200)
        
        body = json.loads(response["body"])
        session = body["session"]
        
        self.assertEqual(session["user_id"], "test-user-1")
        self.assertEqual(session["is_focus_mode"], True)
        self.assertEqual(session["focus_context"], "gym")
        
        # Verify TTL is ~3600 seconds in the future
        self.assertTrue(now + 3590 <= session["ttl_timestamp"] <= now + 3610)
        mock_sessions.put_item.assert_called_once()

    @patch('lambda_recommendations.tracks_table')
    @patch('lambda_recommendations.sessions_table')
    def test_gym_mode_recommendations(self, mock_sessions, mock_tracks):
        # Mock session active in DynamoDB
        mock_sessions.get_item.return_value = {
            "Item": {
                "user_id": "test-user-1",
                "is_focus_mode": True,
                "focus_context": "gym"
            }
        }
        
        # Mock track catalog scan response
        mock_tracks.scan.return_value = {
            "Items": [
                # 10 Fast tracks (Gym Mode target genres and high energy/BPM)
                {"track_id": "track_001", "bpm": 130, "energy": Decimal("0.85"), "genre": "Gym-Phonk", "artist_name": "Slayer"},
                {"track_id": "track_002", "bpm": 150, "energy": Decimal("0.92"), "genre": "Metal", "artist_name": "Iron Crew"},
                {"track_id": "track_003", "bpm": 125, "energy": Decimal("0.81"), "genre": "EDM", "artist_name": "DJ Sunshine"},
                {"track_id": "track_004", "bpm": 140, "energy": Decimal("0.88"), "genre": "Gym-Rock", "artist_name": "Anvil Fury"},
                {"track_id": "track_005", "bpm": 135, "energy": Decimal("0.82"), "genre": "Pop", "artist_name": "Emma Woods"},
                {"track_id": "track_006", "bpm": 128, "energy": Decimal("0.84"), "genre": "Synthwave", "artist_name": "Neon Driver"},
                {"track_id": "track_007", "bpm": 121, "energy": Decimal("0.80"), "genre": "Hip-Hop", "artist_name": "Pulse Master"},
                {"track_id": "track_008", "bpm": 145, "energy": Decimal("0.95"), "genre": "Metal", "artist_name": "Slayer Phonk"},
                {"track_id": "track_009", "bpm": 130, "energy": Decimal("0.87"), "genre": "EDM", "artist_name": "Retro Kid"},
                {"track_id": "track_010", "bpm": 160, "energy": Decimal("0.98"), "genre": "Gym-Phonk", "artist_name": "Pulse Master"},
                # 2 Slow tracks (Should be filtered out)
                {"track_id": "track_011", "bpm": 80, "energy": Decimal("0.25"), "genre": "Lo-Fi", "artist_name": "Coffee"},
                {"track_id": "track_012", "bpm": 90, "energy": Decimal("0.35"), "genre": "Acoustic", "artist_name": "Emma Woods"}
            ]
        }
        
        # Mock event
        event = {
            "httpMethod": "GET",
            "resource": "/recommendations",
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "sub": "test-user-1"
                    }
                }
            }
        }
        
        # Invoke recommendations handler
        response = lambda_recommendations.handler(event, None)
        self.assertEqual(response["statusCode"], 200)
        
        body = json.loads(response["body"])
        self.assertEqual(body["context"], "gym_mode")
        
        # Should only recommend fast tracks (high BPM, high Energy, fast genre)
        recs = body["recommendations"]
        self.assertEqual(len(recs), 10)
        self.assertTrue(all(float(track["energy"]) >= 0.8 for track in recs))
        self.assertTrue(all(track["genre"] not in ["Lo-Fi", "Acoustic"] for track in recs))

    @patch('lambda_recommendations.sagemaker_runtime')
    @patch('lambda_recommendations.tracks_table')
    @patch('lambda_recommendations.users_table')
    @patch('lambda_recommendations.sessions_table')
    def test_sagemaker_recommendations_and_re_ranking(self, mock_sessions, mock_users, mock_tracks, mock_sm):
        # 1. Mock session inactive
        mock_sessions.get_item.return_value = {}
        
        # 2. Mock user profile with history and affinity
        mock_users.get_item.return_value = {
            "Item": {
                "user_id": "test-user-1",
                "play_history": [
                    {"track_id": "track_001", "played_at": "123"},
                    {"track_id": "track_002", "played_at": "124"}
                ],
                "genre_affinity": {"EDM": "0.9"},
                "artist_affinity": {"Neon Driver": "0.8"}
            }
        }
        
        # 3. Mock track detail lookups for taste vector calculation
        def get_track_mock(Key):
            tid = Key["track_id"]
            if tid == "track_001":
                return {"Item": {"track_id": "track_001", "bpm": 120, "energy": 0.8, "danceability": 0.7, "valence": 0.6}}
            elif tid == "track_002":
                return {"Item": {"track_id": "track_002", "bpm": 128, "energy": 0.9, "danceability": 0.8, "valence": 0.7}}
            # Candidates metadata lookups
            elif tid == "track_003": # Boost target - EDM + new artist
                return {"Item": {"track_id": "track_003", "artist_name": "New Kid", "genre": "EDM", "album_name": "Neon Drive"}}
            elif tid == "track_004": # Affinity matching - Neon Driver + Pop (not target genre)
                return {"Item": {"track_id": "track_004", "artist_name": "Neon Driver", "genre": "Pop", "album_name": "Neon Drive"}}
            return {}
            
        mock_tracks.get_item.side_effect = get_track_mock
        
        # 4. Mock SageMaker return values
        mock_body = MagicMock()
        mock_body.read.return_value = json.dumps({
            "track_ids": ["track_003", "track_004"],
            "distances": [0.1, 0.2] # cosine distances (similarity = 0.9 and 0.8)
        }).encode()
        mock_sm.invoke_endpoint.return_value = {"Body": mock_body}
        
        # Mock event
        event = {
            "httpMethod": "GET",
            "resource": "/recommendations",
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "sub": "test-user-1"
                    }
                }
            }
        }
        
        # Invoke recommendations handler
        response = lambda_recommendations.handler(event, None)
        self.assertEqual(response["statusCode"], 200)
        
        body = json.loads(response["body"])
        self.assertEqual(body["context"], "personalized")
        recs = body["recommendations"]
        self.assertEqual(len(recs), 2)
        
        # track_003: Similarity=0.9, GenreAffinity (EDM)=0.9, ArtistAffinity=0.0.
        # Score = (0.9 * 0.5) + (0.9 * 0.3) + (0.0 * 0.2) = 0.45 + 0.27 = 0.72
        # Since it is a new artist ("New Kid") and target genre "EDM", it receives 20% novelty boost:
        # Score = 0.72 * 1.2 = 0.864
        #
        # track_004: Similarity=0.8, GenreAffinity=0.0, ArtistAffinity (Neon Driver)=0.8
        # Score = (0.8 * 0.5) + (0.0 * 0.3) + (0.8 * 0.2) = 0.40 + 0.16 = 0.56. (No boost, since Pop is not a target boosted genre)
        
        # Verify ordering (track_003 has higher score, should be first)
        self.assertEqual(recs[0]["track_id"], "track_003")
        self.assertEqual(recs[1]["track_id"], "track_004")
        self.assertTrue(recs[0].get("novelty_boosted"))

    @patch('lambda_recommendations.tracks_table')
    @patch('lambda_recommendations.sagemaker_runtime')
    @patch('lambda_recommendations.users_table')
    @patch('lambda_recommendations.sessions_table')
    def test_sagemaker_error_boundary_fallback(self, mock_sessions, mock_users, mock_sm, mock_tracks):
        # 1. Inactive session
        mock_sessions.get_item.return_value = {}
        
        # 2. Mock user profile with history
        mock_users.get_item.return_value = {
            "Item": {
                "user_id": "test-user-1",
                "play_history": [{"track_id": "track_001", "played_at": "123"}],
                "genre_affinity": {},
                "artist_affinity": {}
            }
        }
        mock_tracks.get_item.return_value = {
            "Item": {"track_id": "track_001", "bpm": 120, "energy": 0.8, "danceability": 0.7, "valence": 0.6}
        }
        
        # 3. Force SageMaker Endpoint to throw an error
        mock_sm.invoke_endpoint.side_effect = Exception("SageMaker Endpoint is starting up/cold error")
        
        # 4. Mock fallback scan
        mock_tracks.scan.return_value = {
            "Items": [
                {"track_id": "track_040", "track_name": "Fallback 1", "bpm": 100},
                {"track_id": "track_045", "track_name": "Fallback 2", "bpm": 105}
            ]
        }
        
        # Mock event
        event = {
            "httpMethod": "GET",
            "resource": "/recommendations",
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "sub": "test-user-1"
                    }
                }
            }
        }
        
        # Invoke handler
        response = lambda_recommendations.handler(event, None)
        self.assertEqual(response["statusCode"], 200)
        
        body = json.loads(response["body"])
        self.assertEqual(body["context"], "fallback_sagemaker_error")
        recs = body["recommendations"]
        self.assertEqual(len(recs), 2)
        self.assertEqual(recs[0]["track_id"], "track_040")

if __name__ == "__main__":
    unittest.main()
