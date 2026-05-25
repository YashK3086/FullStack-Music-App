resource "aws_dynamodb_table" "tracks" {
  name           = "${var.project_name}-tracks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "track_id"

  attribute {
    name = "track_id"
    type = "S"
  }

  tags = {
    Environment = "Dev"
    Project     = var.project_name
  }
}

resource "aws_dynamodb_table" "users" {
  name           = "${var.project_name}-users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  tags = {
    Environment = "Dev"
    Project     = var.project_name
  }
}

resource "aws_dynamodb_table" "playlists" {
  name           = "${var.project_name}-playlists"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "playlist_id"

  attribute {
    name = "playlist_id"
    type = "S"
  }

  tags = {
    Environment = "Dev"
    Project     = var.project_name
  }
}

resource "aws_dynamodb_table" "sessions" {
  name           = "${var.project_name}-sessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  ttl {
    attribute_name = "ttl_timestamp"
    enabled        = true
  }

  tags = {
    Environment = "Dev"
    Project     = var.project_name
  }
}
