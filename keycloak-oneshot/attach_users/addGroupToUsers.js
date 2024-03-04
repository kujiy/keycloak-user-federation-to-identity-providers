/**
 * keycloakのユーザリストにgroup `YOUR-GROUP-1` を追加するscript
 */
const axios = require('axios');
const qs = require('qs');

const realmName = 'master';
const clientId = 'admin-cli';

// User credentials
const username = 'admin';

const keycloakServerUrl = 'https://keycloak.YOUR_COMPANY.com';
const password = '....';

// ここにグループを追加したいユーザー名のリストを入力
const groups = [
    {
        groupName: 'YOUR-GROUP-1',
        usernamesToAddGroup: [
            "taro",
        ]
    },
    {
        groupName: 'YOUR-GROUP-2',
        usernamesToAddGroup: [
            "taro",
        ]
    },
];


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
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    });
    return response.data.access_token;
}


// ユーザーリストに'YOUR-GROUP-1'グループを追加する関数
async function addGroupToUsers(usernames, groupName) {
    const adminAccessToken = await getAdminAccessToken();
    const groupsEndpoint = `${keycloakServerUrl}/admin/realms/${realmName}/groups`;

    // 'YOUR-GROUP-1'グループのIDを取得
    const groupsResponse = await axios.get(groupsEndpoint, {
        headers: {Authorization: `Bearer ${adminAccessToken}`},
    });
    const group = groupsResponse.data.find(g => g.name === groupName);

    if (!group) {
        throw new Error(`Group not found: ${groupName}`);
    }

    for (const username of usernames) {
        // ユーザーIDを取得
        const usersEndpoint = `${keycloakServerUrl}/admin/realms/${realmName}/users`;
        const usersResponse = await axios.get(usersEndpoint, {
            headers: {Authorization: `Bearer ${adminAccessToken}`},
            params: {username},
        });
        const user = usersResponse.data[0];

        if (!user) {
            console.log(`User not found: ${username}`);
            continue;
        }

        // ユーザーにグループを追加
        const userGroupsEndpoint = `${keycloakServerUrl}/admin/realms/${realmName}/users/${user.id}/groups/${group.id}`;
        await axios.put(userGroupsEndpoint, {}, {
            headers: {
                Authorization: `Bearer ${adminAccessToken}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`Added '${groupName}' group to user: ${username}`);
    }
}

for (const group of groups) {
    addGroupToUsers(group.usernamesToAddGroup, group.groupName)
        .then(() => console.log(`'${group.groupName}' group added to specified users`))
        .catch(error => console.error('An error occurred:', error));
}
