resource "aws_s3_bucket" "assets" {
  bucket = "fs-music-app-assets-${var.account_id}"

  tags = {
    Environment = "Dev"
    Project     = var.project_name
  }
}

# Disable block public access settings for this bucket to allow public read
resource "aws_s3_bucket_public_access_block" "assets_block" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket CORS configuration
resource "aws_s3_bucket_cors_configuration" "assets_cors" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Policy to allow public read of files in bucket
resource "aws_s3_bucket_policy" "assets_policy" {
  bucket = aws_s3_bucket.assets.id
  depends_on = [aws_s3_bucket_public_access_block.assets_block]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.assets.arn}/*"
      }
    ]
  })
}
