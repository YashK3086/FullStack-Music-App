data "archive_file" "crud_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambdas/lambda_crud.py"
  output_path = "${path.module}/../lambdas/lambda_crud.zip"
}

data "archive_file" "recommendations_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambdas/lambda_recommendations.py"
  output_path = "${path.module}/../lambdas/lambda_recommendations.zip"
}

data "archive_file" "session_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambdas/lambda_session.py"
  output_path = "${path.module}/../lambdas/lambda_session.zip"
}

resource "aws_lambda_function" "crud" {
  filename         = data.archive_file.crud_zip.output_path
  function_name    = "${var.project_name}-crud"
  role             = aws_iam_role.lambda_role.arn
  handler          = "lambda_crud.handler"
  source_code_hash = data.archive_file.crud_zip.output_base64sha256
  runtime          = "python3.11"
  timeout          = 15

  environment {
    variables = {
      TRACKS_TABLE    = "${var.project_name}-tracks"
      USERS_TABLE     = "${var.project_name}-users"
      PLAYLISTS_TABLE = "${var.project_name}-playlists"
      SESSIONS_TABLE  = "${var.project_name}-sessions"
      S3_BUCKET       = "fs-music-app-assets-${var.account_id}"
    }
  }

  tags = {
    Environment = "Dev"
    Project     = var.project_name
  }
}

resource "aws_lambda_function" "recommendations" {
  filename         = data.archive_file.recommendations_zip.output_path
  function_name    = "${var.project_name}-recommendations"
  role             = aws_iam_role.lambda_role.arn
  handler          = "lambda_recommendations.handler"
  source_code_hash = data.archive_file.recommendations_zip.output_base64sha256
  runtime          = "python3.11"
  timeout          = 30

  environment {
    variables = {
      TRACKS_TABLE       = "${var.project_name}-tracks"
      USERS_TABLE        = "${var.project_name}-users"
      PLAYLISTS_TABLE    = "${var.project_name}-playlists"
      SESSIONS_TABLE     = "${var.project_name}-sessions"
      SAGEMAKER_ENDPOINT = "music-app-knn-endpoint"
    }
  }

  tags = {
    Environment = "Dev"
    Project     = var.project_name
  }
}

resource "aws_lambda_function" "session" {
  filename         = data.archive_file.session_zip.output_path
  function_name    = "${var.project_name}-session"
  role             = aws_iam_role.lambda_role.arn
  handler          = "lambda_session.handler"
  source_code_hash = data.archive_file.session_zip.output_base64sha256
  runtime          = "python3.11"
  timeout          = 15

  environment {
    variables = {
      SESSIONS_TABLE  = "${var.project_name}-sessions"
    }
  }

  tags = {
    Environment = "Dev"
    Project     = var.project_name
  }
}
