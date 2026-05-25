# 1. SageMaker Execution Role
resource "aws_iam_role" "sagemaker_role" {
  name = "SageMakerExecutionRole-MusicApp"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sagemaker_full" {
  role       = aws_iam_role.sagemaker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy_attachment" "sagemaker_s3" {
  role       = aws_iam_role.sagemaker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

# 2. Lambda Execution Role
resource "aws_iam_role" "lambda_role" {
  name = "LambdaExecutionRole-MusicApp"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Policy for Lambda to access DynamoDB, SageMaker invoke, and S3 read
resource "aws_iam_policy" "lambda_policy" {
  name        = "LambdaPolicy-MusicApp"
  description = "Permissions for Music App Lambda CRUD, recommendations, and session management."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:BatchWriteItem",
          "dynamodb:BatchGetItem"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${var.account_id}:table/${var.project_name}-tracks",
          "arn:aws:dynamodb:${var.aws_region}:${var.account_id}:table/${var.project_name}-users",
          "arn:aws:dynamodb:${var.aws_region}:${var.account_id}:table/${var.project_name}-playlists",
          "arn:aws:dynamodb:${var.aws_region}:${var.account_id}:table/${var.project_name}-sessions"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sagemaker:InvokeEndpoint"
        ]
        Resource = "arn:aws:sagemaker:${var.aws_region}:${var.account_id}:endpoint/music-app-knn-endpoint"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::fs-music-app-assets-${var.account_id}",
          "arn:aws:s3:::fs-music-app-assets-${var.account_id}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}
