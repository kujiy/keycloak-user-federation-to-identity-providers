import json
from random import randint
import requests
from requests.auth import HTTPBasicAuth


# Keycloakの設定

admin_username = "admin"  # 管理者ユーザー名
client_id = "admin-cli"  # クライアントID
realm = "master"  # 現在のレルム名
idp_alias = 'my-oidc'  # IdPのエイリアス

keycloak_url = 'https://keycloak.YOUR_COMPANY.com'
admin_password = '....'


# トークンの取得
headers = {}
def set_token():
    global headers
    url = f"{keycloak_url}/realms/master/protocol/openid-connect/token"
    payload = {
        'client_id': client_id,
        'username': admin_username,
        'password': admin_password,
        'grant_type': 'password'
    }
    response = requests.post(url, data=payload)
    headers = {
        'Authorization': f'Bearer {response.json()["access_token"]}',
        'Content-Type': 'application/json'
    }
set_token()

# ユーザーの取得（ページネーション対応）
def get_all_users(per_page=1000):
    all_users = []
    first = 0
    while True:
        url = f"{keycloak_url}/admin/realms/{realm}/users?max={per_page}&first={first}"
        response = requests.get(url, headers=headers)
        users = response.json()
        all_users.extend(users)
        if len(users) < per_page:
            break  # 取得したユーザー数がper_page未満なら、すべてのユーザーを取得したと見なす
        first += per_page
    return all_users

# ユーザーのインポート
def create_user(user):
    url = f"{keycloak_url}/admin/realms/{realm}/users"
    response = requests.post(url, json=user, headers=headers)
    response.raise_for_status()
    # Locationヘッダーから新しいユーザーのIDを取得
    location_header = response.headers.get('Location')
    user_id = location_header.rsplit('/', 1)[1]  # URLの最後の部分がユーザーID
    return user_id


# Function to get user by username from Keycloak
def get_user_by_username(username):
    search_user_url = f'{keycloak_url}/admin/realms/{realm}/users'
    # Query parameters for the request
    params = {
        'username': username,
        'exact': 'true'  # To search for exact match of username
    }

    # Make the GET request to search for the user
    response = requests.get(search_user_url, headers=headers, params=params)

    # Check if the request was successful
    if response.status_code == 200:
        return response.json()


def create(new_user):
    if randint(0, 20) == 0:
        set_token() # たまにtokenキレるので
        print('updated token')
    new_user["username"] = new_user["username"].upper()
    username = new_user["username"]
    try:
        user_uuid = create_user(new_user)
        if user_uuid:
            print(f"User {username} imported successfully.")
        else:
            print(f"Failed to import user {username}.")
    except requests.exceptions.HTTPError as e:
        if '409 Client Error: Conflict' in str(e):
            print(f"User already exists {username}.")
            user_uuid = get_user_by_username(username)[0]['id']
        else:
            print(f"[ERROR] Failed to import user {username}.")
            print(e)
            return

    # ユーザーとIdPのアカウントをリンク
    federated_identity_url = f'{keycloak_url}/admin/realms/{realm}/users/{user_uuid}/federated-identity/{idp_alias}'
    federated_identity_data = {
        'userId': username,   # username
        'userName': new_user['email'],  # email
        'identityProvider': idp_alias,
    }
    response = requests.post(federated_identity_url, json=federated_identity_data, headers=headers)
    if response.status_code == 204:
        print('User linked successfully ' + username)
    elif response.status_code == 409:
        print('User already linked ' + username)
    else:
        print('[ERROR] Failed to link user')

def store_all_users():
    users = get_all_users()
    to_file_list = []
    for user in users:
        if 'attributes' not in user or 'LDAP_ENTRY_DN' not in user['attributes']:
            continue

        # ユーザーの属性をkeycloak user createように調整
        new_user = {
            'username': user["username"].upper(),
            'enabled': True,
            'emailVerified': False,
            "firstName": user.get("firstName"),
            "lastName": user.get("lastName"),
            'email': user.get("email")
        }
        print(new_user)
        to_file_list.append(new_user)

    # ユーザ情報をJSONファイルとして保存
    with open('users.json', 'w') as f:
        json.dump(to_file_list, f, indent=4)
    print('Users information saved to users.json')


def delete_users_json():
    with open('users.json', 'w') as f:
        f.write('[]')
    print('Users information deleted from users.json')


def main():
    if 1:
        delete_users_json()
        store_all_users()

        # ここで一時停止して、LDAPユーザをUIから全て消す
        pass

    # ユーザ情報をJSONファイルから読み込み
    with open('users.json', 'r') as f:
        users = json.load(f)
    for user in users:
        create(user)


if __name__ == "__main__":
    main()
