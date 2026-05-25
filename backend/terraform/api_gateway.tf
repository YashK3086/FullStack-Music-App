resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-api"
  description = "REST API for Smart Music Streaming Fullstack Application"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_authorizer" "cognito" {
  name          = "CognitoAuthorizer"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.api.id
  provider_arns = [aws_cognito_user_pool.user_pool.arn]
}

# --- Resource Declarations ---

# 1. /recommendations
resource "aws_api_gateway_resource" "recommendations" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "recommendations"
}

# 2. /session
resource "aws_api_gateway_resource" "session" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "session"
}

# 2a. /session/start
resource "aws_api_gateway_resource" "session_start" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.session.id
  path_part   = "start"
}

# 3. /playlists
resource "aws_api_gateway_resource" "playlists" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "playlists"
}

# 3a. /playlists/{playlist_id}
resource "aws_api_gateway_resource" "playlist_item" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.playlists.id
  path_part   = "{playlist_id}"
}

# 4. /tracks
resource "aws_api_gateway_resource" "tracks" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "tracks"
}

# 4a. /tracks/favorite
resource "aws_api_gateway_resource" "tracks_favorite" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.tracks.id
  path_part   = "favorite"
}

# 4b. /tracks/play
resource "aws_api_gateway_resource" "tracks_play" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.tracks.id
  path_part   = "play"
}


# --- HTTP Methods & Lambda Integrations ---

# GET /recommendations
resource "aws_api_gateway_method" "recommendations_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.recommendations.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "recommendations_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.recommendations.id
  http_method             = aws_api_gateway_method.recommendations_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.recommendations.invoke_arn
}

# POST /session/start
resource "aws_api_gateway_method" "session_start_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.session_start.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "session_start_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.session_start.id
  http_method             = aws_api_gateway_method.session_start_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.session.invoke_arn
}

# GET /playlists
resource "aws_api_gateway_method" "playlists_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.playlists.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "playlists_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.playlists.id
  http_method             = aws_api_gateway_method.playlists_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.crud.invoke_arn
}

# POST /playlists
resource "aws_api_gateway_method" "playlists_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.playlists.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "playlists_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.playlists.id
  http_method             = aws_api_gateway_method.playlists_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.crud.invoke_arn
}

# PUT /playlists/{playlist_id}
resource "aws_api_gateway_method" "playlist_item_put" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.playlist_item.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "playlist_item_put_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.playlist_item.id
  http_method             = aws_api_gateway_method.playlist_item_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.crud.invoke_arn
}

# DELETE /playlists/{playlist_id}
resource "aws_api_gateway_method" "playlist_item_delete" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.playlist_item.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "playlist_item_delete_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.playlist_item.id
  http_method             = aws_api_gateway_method.playlist_item_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.crud.invoke_arn
}

# POST /tracks/favorite
resource "aws_api_gateway_method" "tracks_favorite_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.tracks_favorite.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "tracks_favorite_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.tracks_favorite.id
  http_method             = aws_api_gateway_method.tracks_favorite_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.crud.invoke_arn
}

# POST /tracks/play
resource "aws_api_gateway_method" "tracks_play_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.tracks_play.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "tracks_play_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.tracks_play.id
  http_method             = aws_api_gateway_method.tracks_play_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.crud.invoke_arn
}


# --- Lambda Invoke Permissions ---

resource "aws_lambda_permission" "apigw_crud" {
  statement_id  = "AllowAPIGatewayInvokeCRUD"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.crud.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_recommendations" {
  statement_id  = "AllowAPIGatewayInvokeRecs"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.recommendations.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_session" {
  statement_id  = "AllowAPIGatewayInvokeSession"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.session.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}


# --- CORS Preflight OPTIONS Mock Integrations (Manual and Registry-Free) ---

# 1. OPTIONS /recommendations
resource "aws_api_gateway_method" "recommendations_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.recommendations.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "recommendations_options_int" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.recommendations.id
  http_method = aws_api_gateway_method.recommendations_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "recommendations_options_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.recommendations.id
  http_method = aws_api_gateway_method.recommendations_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "recommendations_options_int_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.recommendations.id
  http_method = aws_api_gateway_method.recommendations_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [
    aws_api_gateway_integration.recommendations_options_int,
    aws_api_gateway_method_response.recommendations_options_res
  ]
}

# 2. OPTIONS /session/start
resource "aws_api_gateway_method" "session_start_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.session_start.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "session_start_options_int" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.session_start.id
  http_method = aws_api_gateway_method.session_start_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "session_start_options_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.session_start.id
  http_method = aws_api_gateway_method.session_start_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "session_start_options_int_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.session_start.id
  http_method = aws_api_gateway_method.session_start_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [
    aws_api_gateway_integration.session_start_options_int,
    aws_api_gateway_method_response.session_start_options_res
  ]
}

# 3. OPTIONS /playlists
resource "aws_api_gateway_method" "playlists_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.playlists.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "playlists_options_int" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.playlists.id
  http_method = aws_api_gateway_method.playlists_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "playlists_options_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.playlists.id
  http_method = aws_api_gateway_method.playlists_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "playlists_options_int_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.playlists.id
  http_method = aws_api_gateway_method.playlists_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [
    aws_api_gateway_integration.playlists_options_int,
    aws_api_gateway_method_response.playlists_options_res
  ]
}

# 4. OPTIONS /playlists/{playlist_id}
resource "aws_api_gateway_method" "playlist_item_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.playlist_item.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "playlist_item_options_int" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.playlist_item.id
  http_method = aws_api_gateway_method.playlist_item_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "playlist_item_options_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.playlist_item.id
  http_method = aws_api_gateway_method.playlist_item_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "playlist_item_options_int_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.playlist_item.id
  http_method = aws_api_gateway_method.playlist_item_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [
    aws_api_gateway_integration.playlist_item_options_int,
    aws_api_gateway_method_response.playlist_item_options_res
  ]
}

# 5. OPTIONS /tracks/favorite
resource "aws_api_gateway_method" "tracks_favorite_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.tracks_favorite.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "tracks_favorite_options_int" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.tracks_favorite.id
  http_method = aws_api_gateway_method.tracks_favorite_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "tracks_favorite_options_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.tracks_favorite.id
  http_method = aws_api_gateway_method.tracks_favorite_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "tracks_favorite_options_int_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.tracks_favorite.id
  http_method = aws_api_gateway_method.tracks_favorite_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [
    aws_api_gateway_integration.tracks_favorite_options_int,
    aws_api_gateway_method_response.tracks_favorite_options_res
  ]
}

# 6. OPTIONS /tracks/play
resource "aws_api_gateway_method" "tracks_play_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.tracks_play.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "tracks_play_options_int" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.tracks_play.id
  http_method = aws_api_gateway_method.tracks_play_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "tracks_play_options_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.tracks_play.id
  http_method = aws_api_gateway_method.tracks_play_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "tracks_play_options_int_res" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.tracks_play.id
  http_method = aws_api_gateway_method.tracks_play_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
  depends_on = [
    aws_api_gateway_integration.tracks_play_options_int,
    aws_api_gateway_method_response.tracks_play_options_res
  ]
}


# --- Deployment & Stages ---

resource "aws_api_gateway_deployment" "deployment" {
  depends_on = [
    aws_api_gateway_integration.recommendations_get_integration,
    aws_api_gateway_integration.session_start_post_integration,
    aws_api_gateway_integration.playlists_get_integration,
    aws_api_gateway_integration.playlists_post_integration,
    aws_api_gateway_integration.playlist_item_put_integration,
    aws_api_gateway_integration.playlist_item_delete_integration,
    aws_api_gateway_integration.tracks_favorite_post_integration,
    aws_api_gateway_integration.tracks_play_post_integration,
    
    aws_api_gateway_integration_response.recommendations_options_int_res,
    aws_api_gateway_integration_response.playlists_options_int_res,
    aws_api_gateway_integration_response.playlist_item_options_int_res,
    aws_api_gateway_integration_response.tracks_favorite_options_int_res,
    aws_api_gateway_integration_response.tracks_play_options_int_res
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id

  # Forces redeployment on API structure changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.recommendations.id,
      aws_api_gateway_resource.session_start.id,
      aws_api_gateway_resource.playlists.id,
      aws_api_gateway_resource.playlist_item.id,
      aws_api_gateway_resource.tracks_favorite.id,
      aws_api_gateway_resource.tracks_play.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "dev" {
  deployment_id = aws_api_gateway_deployment.deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "dev"
}

output "api_endpoint" {
  value = aws_api_gateway_stage.dev.invoke_url
}
