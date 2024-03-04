/**
 * keycloakのユーザリストにadmin roleを追加するscript
 */
const axios = require('axios');
const qs = require('qs');

const realmName = 'master';
const adminClientId = 'admin-cli';
const adminUsername = 'admin';

const keycloakServerUrl = 'https://keycloak.YOUR_COMPANY.com';
const adminPassword = '....';

const groups = [
    {
        client: "YOUR-CLIENT-1",
        roleName: "admin",
        usernameList: [
            "taro",
        ]
    },
    {
        client: "YOUR-CLIENT-2",
        roleName: "operator",
        usernameList: [
            "taro",
        ]
    },
    {
        client: "YOUR-CLIENT-3",
        roleName: "manager",
        usernameList: [
            "taro",
        ]
    },
]

// Keycloakへのログインとアクセストークンの取得
async function getKeycloakAdminToken() {
    const tokenUrl = `${keycloakServerUrl}/realms/master/protocol/openid-connect/token`;
    const data = qs.stringify({
        client_id: adminClientId,
        username: adminUsername,
        password: adminPassword,
        grant_type: 'password'
    });
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    try {
        const response = await axios.post(tokenUrl, data, { headers });
        return response.data.access_token;
    } catch (error) {
        console.error('Failed to get admin token:', error);
        throw error;
    }
}

// クライアントのロールにユーザーを追加する関数
async function addUserToClientRoles(clientName, roleName, usernameList) {
    const adminToken = await getKeycloakAdminToken();
    const headers = {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
    };

    // クライアントIDの取得
    const clientsUrl = `${keycloakServerUrl}/admin/realms/${realmName}/clients`;
    const clientsResponse = await axios.get(clientsUrl, { headers });
    const client = clientsResponse.data.find(c => c.clientId === clientName);
    if (!client) {
        console.error(`Client ${clientName} not found.`);
        return;
    }

    // クライアントロールの取得
    const rolesUrl = `${keycloakServerUrl}/admin/realms/${realmName}/clients/${client.id}/roles/${roleName}`;
    const roleResponse = await axios.get(rolesUrl, { headers });
    const role = roleResponse.data;

    // ユーザーのロールマッピングを更新
    for (const username of usernameList) {
        // ユーザーIDの取得
        const usersUrl = `${keycloakServerUrl}/admin/realms/${realmName}/users`;
        const usersResponse = await axios.get(usersUrl, {
            headers,
            params: { username }
        });
        const user = usersResponse.data[0];
        if (!user) {
            console.error(`User ${username} not found.`);
            continue;
        }

        // ロールをユーザーに追加
        const roleMappingUrl = `${keycloakServerUrl}/admin/realms/${realmName}/users/${user.id}/role-mappings/clients/${client.id}`;
        await axios.post(roleMappingUrl, [role], { headers });
        console.log(`Added role ${roleName} to user ${username}`);
    }
}

for (const group of groups) {
    addUserToClientRoles(group.client, group.roleName, group.usernameList).catch(console.error);
}

