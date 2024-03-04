/**
 * keycloakのユーザリストにadmin roleを追加するscript
 */
const axios = require('axios');
const qs = require('qs');

const realmName = 'master';
const clientId = 'admin-cli';

// User credentials
const username = 'admin';

const keycloakServerUrl = 'https://keycloak.YOUR_COMPANY.com';
const password = '....';


// ここにadminロールを追加したいユーザー名のリストを入力
const usernamesToAddRole = [
    "admin",
    "taro",
]; // ここにadminロールを追加したいユーザー名のリストを入力


// 管理APIへのアクセストークンを取得する関数
async function getAdminAccessToken() {
    const tokenEndpoint = `${keycloakServerUrl}/realms/${realmName}/protocol/openid-connect/token`;
    const payload = {
        client_id: clientId,
        username: username,
        password: password,
        grant_type: 'password',
    };

    const response = await axios.post(tokenEndpoint, qs.stringify(payload), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data.access_token;
}

// adminロールを持っていないユーザにadminロールを追加する関数
async function addAdminRoleToUsers(usernames) {
    const adminAccessToken = await getAdminAccessToken();
    const rolesEndpoint = `${keycloakServerUrl}/admin/realms/${realmName}/roles`;

    // adminロールの情報を取得
    const rolesResponse = await axios.get(rolesEndpoint, {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    const adminRole = rolesResponse.data.find(role => role.name === 'admin');

    if (!adminRole) {
        throw new Error('Admin role not found');
    }

    for (const username of usernames) {
        // ユーザーIDを取得
        const usersEndpoint = `${keycloakServerUrl}/admin/realms/${realmName}/users`;
        const usersResponse = await axios.get(usersEndpoint, {
            headers: { Authorization: `Bearer ${adminAccessToken}` },
            params: { username },
        });
        const user = usersResponse.data[0];

        if (!user) {
            console.log(`User not found: ${username}`);
            continue;
        }

        // adminロールをユーザーに追加
        const userRolesEndpoint = `${keycloakServerUrl}/admin/realms/${realmName}/users/${user.id}/role-mappings/realm`;
        await axios.post(userRolesEndpoint, [adminRole], {
            headers: {
                Authorization: `Bearer ${adminAccessToken}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`Added admin role to user: ${username}`);
    }
}


addAdminRoleToUsers(usernamesToAddRole)
    .then(() => console.log('Admin role added to specified users'))
    .catch(error => console.error('An error occurred:', error));
