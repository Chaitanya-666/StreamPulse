const fs = require('fs');

const collection = {
  info: {
    name: "youtube-backend",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "user",
      item: [
        {
          name: "Register User",
          request: {
            method: "POST",
            header: [],
            body: {
              mode: "formdata",
              formdata: [
                { key: "username", value: "johndoe", type: "text" },
                { key: "email", value: "john@example.com", type: "text" },
                { key: "password", value: "securepassword", type: "text" },
                { key: "fullName", value: "{\"firstName\": \"John\", \"lastName\": \"Doe\"}", type: "text" },
                { key: "avatar", type: "file" },
                { key: "coverImage", type: "file" }
              ]
            },
            url: {
              raw: "{{baseUrl}}/users/register",
              host: ["{{baseUrl}}"],
              path: ["users", "register"]
            }
          }
        },
        {
          name: "Login User",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                username: "johndoe",
                email: "john@example.com",
                password: "securepassword"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/users/login",
              host: ["{{baseUrl}}"],
              path: ["users", "login"]
            }
          }
        },
        {
          name: "Logout User",
          request: {
            method: "POST",
            header: [],
            url: {
              raw: "{{baseUrl}}/users/logout",
              host: ["{{baseUrl}}"],
              path: ["users", "logout"]
            },
            description: "Auth Note: This route requires verifyJWT authentication."
          }
        },
        {
          name: "Change Password",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                currPassword: "oldpassword",
                newPassword: "newpassword",
                ConfirmNewPassword: "newpassword"
              }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/users/change-password",
              host: ["{{baseUrl}}"],
              path: ["users", "change-password"]
            },
            description: "Auth Note: This route requires verifyJWT authentication."
          }
        },
        {
          name: "Current User",
          request: {
            method: "POST",
            header: [],
            url: {
              raw: "{{baseUrl}}/users/current-user",
              host: ["{{baseUrl}}"],
              path: ["users", "current-user"]
            },
            description: "Auth Note: This route requires verifyJWT authentication."
          }
        },
        {
          name: "Update Account Details",
          request: {
            method: "PATCH",
            header: [],
            body: {
              mode: "formdata",
              formdata: [
                { key: "newUsername", value: "newjohndoe", type: "text" },
                { key: "newEmailAddress", value: "newjohn@example.com", type: "text" },
                { key: "newFirstName", value: "Johnny", type: "text" },
                { key: "newMiddleName", value: "M", type: "text" },
                { key: "newLastName", value: "Doe", type: "text" },
                { key: "avatar", type: "file" },
                { key: "coverImage", type: "file" }
              ]
            },
            url: {
              raw: "{{baseUrl}}/users/update-accountDetails",
              host: ["{{baseUrl}}"],
              path: ["users", "update-accountDetails"]
            },
            description: "Auth Note: This route requires verifyJWT authentication."
          }
        },
        {
          name: "Get User Channel Profile",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users/ch/:username",
              host: ["{{baseUrl}}"],
              path: ["users", "ch", ":username"],
              variable: [
                { key: "username", value: "johndoe" }
              ]
            }
          }
        },
        {
          name: "Get User Watch History",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users/history",
              host: ["{{baseUrl}}"],
              path: ["users", "history"]
            },
            description: "Auth Note: This route requires verifyJWT authentication."
          }
        }
      ]
    }
  ]
};

const environment = {
  name: "Youtube Backend Env",
  values: [
    {
      key: "baseUrl",
      value: "http://localhost:8000/api/v1",
      type: "default",
      enabled: true
    }
  ],
  _postman_variable_scope: "environment"
};

fs.writeFileSync('youtube-backend.postman_collection.json', JSON.stringify(collection, null, 2));
fs.writeFileSync('postman_environment.json', JSON.stringify(environment, null, 2));

console.log("Postman files generated.");
