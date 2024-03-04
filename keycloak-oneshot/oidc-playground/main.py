import json

import requests
from requests_oauthlib import OAuth2Session
from oauthlib.oauth2 import BackendApplicationClient, WebApplicationClient
import os

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

OIDC_CLIENT_ID = '...'
OIDC_CLIENT_SECRET = '...'
# OpenID Connect Discoveryエンドポイント
discovery_url = 'https://your-idp.example.com/.well-known/openid-configuration'

# 設定を取得する
response = requests.get(discovery_url)
oidc_config = response.json()

# 設定から必要なエンドポイントを取得
authorization_base_url = oidc_config['authorization_endpoint']
token_url = oidc_config['token_endpoint']
userinfo_url = oidc_config['userinfo_endpoint']

# 環境変数からクライアントIDとクライアントシークレットを取得
client_id = OIDC_CLIENT_ID
client_secret = OIDC_CLIENT_SECRET

# リダイレクトURIを設定
redirect_uri = 'http://your-test-client.example.com/index.php'
scope = ['openid', 'profile', 'email', 'groups']

# OAuth2セッションを開始
client = WebApplicationClient(client_id=client_id)
oauth = OAuth2Session(client_id=client_id, redirect_uri=redirect_uri, scope=scope)

# 認証URLを取得
# 'https://your-idp.example.com/as/authorization.oauth2?response_type=code&client_id=...&redirect_uri=http%3A%2F%2Fyour-test-client.example.com%2Findex.php&state=...'
authorization_url, state = oauth.authorization_url(authorization_base_url)

print('Please go to {} and authorize access.'.format(authorization_url))
print('Waiting for authorization...')

# ブラウザを開いて上記のURLにアクセスし、認証を完了させる
# ブラウザからリダイレクトされたURLから認証コードを取得する
# http://your-test-client.example.com/index.php?code=...
redirect_response = input('Paste the full redirect URL here: ')

# 認証コードを使用してトークンを取得
"""
{
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "Bearer",
    "expires_in": 7199,
    "expires_at": 1707777777.000000
}
"""
token = oauth.fetch_token(token_url, client_secret=client_secret,
                          authorization_response=redirect_response)

# トークンを使用してユーザー情報を取得
"""
{
  "sub": "taro",
  "name": "taro",
  "email": "taro@YOUR_COMPANY.com"
}
"""
userinfo_response = oauth.get(userinfo_url)

# ユーザー情報を表示
print(json.dumps(userinfo_response.json(), indent=2))
