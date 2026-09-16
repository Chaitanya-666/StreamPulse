const fs = require('fs');

const collection = {
  info: {
    name: "StreamPulse Backend API",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "Healthcheck",
      item: [
        {
          name: "Server Health Check",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/healthcheck",
              host: ["{{baseUrl}}"],
              path: ["healthcheck"]
            }
          }
        }
      ]
    },
    {
      name: "User",
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
            header: [{ key: "Content-Type", value: "application/json" }],
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
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Change Password",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
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
            description: "Auth Note: Requires verifyJWT"
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
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Get Channel Profile",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users/ch/:username",
              host: ["{{baseUrl}}"],
              path: ["users", "ch", ":username"],
              variable: [{ key: "username", value: "johndoe" }]
            }
          }
        },
        {
          name: "Get Watch History",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/users/history",
              host: ["{{baseUrl}}"],
              path: ["users", "history"]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        }
      ]
    },
    {
      name: "Video",
      item: [
        {
          name: "Get All Videos (Paginated)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/videos?page=1&limit=10&query=tutorial&sortBy=views&sortType=desc",
              host: ["{{baseUrl}}"],
              path: ["videos"],
              query: [
                { key: "page", value: "1" },
                { key: "limit", value: "10" },
                { key: "query", value: "tutorial" },
                { key: "sortBy", value: "views" },
                { key: "sortType", value: "desc" }
              ]
            }
          }
        },
        {
          name: "Publish Video",
          request: {
            method: "POST",
            header: [],
            body: {
              mode: "formdata",
              formdata: [
                { key: "title", value: "My Awesome Video", type: "text" },
                { key: "description", value: "Comprehensive walkthrough of MERN stack", type: "text" },
                { key: "videoFile", type: "file" },
                { key: "thumbnail", type: "file" }
              ]
            },
            url: {
              raw: "{{baseUrl}}/videos",
              host: ["{{baseUrl}}"],
              path: ["videos"]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Get Video By ID",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/videos/:videoId",
              host: ["{{baseUrl}}"],
              path: ["videos", ":videoId"],
              variable: [{ key: "videoId", value: "660c1bf64c398321456a789b" }]
            }
          }
        },
        {
          name: "Update Video",
          request: {
            method: "PATCH",
            header: [],
            body: {
              mode: "formdata",
              formdata: [
                { key: "title", value: "Updated Title", type: "text" },
                { key: "description", value: "Updated Description", type: "text" },
                { key: "thumbnail", type: "file" }
              ]
            },
            url: {
              raw: "{{baseUrl}}/videos/:videoId",
              host: ["{{baseUrl}}"],
              path: ["videos", ":videoId"],
              variable: [{ key: "videoId", value: "660c1bf64c398321456a789b" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Delete Video",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{baseUrl}}/videos/:videoId",
              host: ["{{baseUrl}}"],
              path: ["videos", ":videoId"],
              variable: [{ key: "videoId", value: "660c1bf64c398321456a789b" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Toggle Publish Status",
          request: {
            method: "PATCH",
            header: [],
            url: {
              raw: "{{baseUrl}}/videos/toggle/publish/:videoId",
              host: ["{{baseUrl}}"],
              path: ["videos", "toggle", "publish", ":videoId"],
              variable: [{ key: "videoId", value: "660c1bf64c398321456a789b" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        }
      ]
    },
    {
      name: "Comment",
      item: [
        {
          name: "Get Video Comments",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/comments/:videoId?page=1&limit=10",
              host: ["{{baseUrl}}"],
              path: ["comments", ":videoId"],
              variable: [{ key: "videoId", value: "660c1bf64c398321456a789b" }],
              query: [
                { key: "page", value: "1" },
                { key: "limit", value: "10" }
              ]
            }
          }
        },
        {
          name: "Add Comment",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ content: "Great explanation of MongoDB pipelines!" }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/comments/:videoId",
              host: ["{{baseUrl}}"],
              path: ["comments", ":videoId"],
              variable: [{ key: "videoId", value: "660c1bf64c398321456a789b" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Update Comment",
          request: {
            method: "PATCH",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ content: "Updated comment text" }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/comments/c/:commentId",
              host: ["{{baseUrl}}"],
              path: ["comments", "c", ":commentId"],
              variable: [{ key: "commentId", value: "660c1bf64c398321456a789c" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Delete Comment",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{baseUrl}}/comments/c/:commentId",
              host: ["{{baseUrl}}"],
              path: ["comments", "c", ":commentId"],
              variable: [{ key: "commentId", value: "660c1bf64c398321456a789c" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        }
      ]
    },
    {
      name: "Like",
      item: [
        {
          name: "Toggle Video Like",
          request: {
            method: "POST",
            header: [],
            url: {
              raw: "{{baseUrl}}/likes/toggle/v/:videoId",
              host: ["{{baseUrl}}"],
              path: ["likes", "toggle", "v", ":videoId"],
              variable: [{ key: "videoId", value: "660c1bf64c398321456a789b" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Toggle Comment Like",
          request: {
            method: "POST",
            header: [],
            url: {
              raw: "{{baseUrl}}/likes/toggle/c/:commentId",
              host: ["{{baseUrl}}"],
              path: ["likes", "toggle", "c", ":commentId"],
              variable: [{ key: "commentId", value: "660c1bf64c398321456a789c" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Toggle Post Like",
          request: {
            method: "POST",
            header: [],
            url: {
              raw: "{{baseUrl}}/likes/toggle/p/:postId",
              host: ["{{baseUrl}}"],
              path: ["likes", "toggle", "p", ":postId"],
              variable: [{ key: "postId", value: "660c1bf64c398321456a789d" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Get Liked Videos",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/likes/videos",
              host: ["{{baseUrl}}"],
              path: ["likes", "videos"]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        }
      ]
    },
    {
      name: "Subscription",
      item: [
        {
          name: "Toggle Subscription",
          request: {
            method: "POST",
            header: [],
            url: {
              raw: "{{baseUrl}}/subscriptions/c/:channelId",
              host: ["{{baseUrl}}"],
              path: ["subscriptions", "c", ":channelId"],
              variable: [{ key: "channelId", value: "660c1bf64c398321456a789a" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Get Channel Subscribers",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/subscriptions/c/:channelId",
              host: ["{{baseUrl}}"],
              path: ["subscriptions", "c", ":channelId"],
              variable: [{ key: "channelId", value: "660c1bf64c398321456a789a" }]
            }
          }
        },
        {
          name: "Get Subscribed Channels",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/subscriptions/u/:subscriberId",
              host: ["{{baseUrl}}"],
              path: ["subscriptions", "u", ":subscriberId"],
              variable: [{ key: "subscriberId", value: "660c1bf64c398321456a789a" }]
            }
          }
        }
      ]
    },
    {
      name: "Playlist",
      item: [
        {
          name: "Create Playlist",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ name: "MERN Stack Tutorials", description: "All complete fullstack lectures" }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/playlists",
              host: ["{{baseUrl}}"],
              path: ["playlists"]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Get Playlist By ID",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/playlists/:playlistId",
              host: ["{{baseUrl}}"],
              path: ["playlists", ":playlistId"],
              variable: [{ key: "playlistId", value: "660c1bf64c398321456a789e" }]
            }
          }
        },
        {
          name: "Add Video To Playlist",
          request: {
            method: "PATCH",
            header: [],
            url: {
              raw: "{{baseUrl}}/playlists/add/:videoId/:playlistId",
              host: ["{{baseUrl}}"],
              path: ["playlists", "add", ":videoId", ":playlistId"],
              variable: [
                { key: "videoId", value: "660c1bf64c398321456a789b" },
                { key: "playlistId", value: "660c1bf64c398321456a789e" }
              ]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Remove Video From Playlist",
          request: {
            method: "PATCH",
            header: [],
            url: {
              raw: "{{baseUrl}}/playlists/remove/:videoId/:playlistId",
              host: ["{{baseUrl}}"],
              path: ["playlists", "remove", ":videoId", ":playlistId"],
              variable: [
                { key: "videoId", value: "660c1bf64c398321456a789b" },
                { key: "playlistId", value: "660c1bf64c398321456a789e" }
              ]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Get User Playlists",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/playlists/user/:userId",
              host: ["{{baseUrl}}"],
              path: ["playlists", "user", ":userId"],
              variable: [{ key: "userId", value: "660c1bf64c398321456a789a" }]
            }
          }
        },
        {
          name: "Update Playlist",
          request: {
            method: "PATCH",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ name: "Updated Playlist Name", description: "Updated playlist description" }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/playlists/:playlistId",
              host: ["{{baseUrl}}"],
              path: ["playlists", ":playlistId"],
              variable: [{ key: "playlistId", value: "660c1bf64c398321456a789e" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Delete Playlist",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{baseUrl}}/playlists/:playlistId",
              host: ["{{baseUrl}}"],
              path: ["playlists", ":playlistId"],
              variable: [{ key: "playlistId", value: "660c1bf64c398321456a789e" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        }
      ]
    },
    {
      name: "Post",
      item: [
        {
          name: "Create Post",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ content: "Excited to launch StreamPulse today!" }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/posts",
              host: ["{{baseUrl}}"],
              path: ["posts"]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Get User Posts",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/posts/user/:userId",
              host: ["{{baseUrl}}"],
              path: ["posts", "user", ":userId"],
              variable: [{ key: "userId", value: "660c1bf64c398321456a789a" }]
            }
          }
        },
        {
          name: "Update Post",
          request: {
            method: "PATCH",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({ content: "Updated community announcement post!" }, null, 2)
            },
            url: {
              raw: "{{baseUrl}}/posts/:postId",
              host: ["{{baseUrl}}"],
              path: ["posts", ":postId"],
              variable: [{ key: "postId", value: "660c1bf64c398321456a789d" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Delete Post",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{baseUrl}}/posts/:postId",
              host: ["{{baseUrl}}"],
              path: ["posts", ":postId"],
              variable: [{ key: "postId", value: "660c1bf64c398321456a789d" }]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        }
      ]
    },
    {
      name: "Dashboard",
      item: [
        {
          name: "Get Channel Stats",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/dashboard/stats",
              host: ["{{baseUrl}}"],
              path: ["dashboard", "stats"]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        },
        {
          name: "Get Channel Videos",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{baseUrl}}/dashboard/videos",
              host: ["{{baseUrl}}"],
              path: ["dashboard", "videos"]
            },
            description: "Auth Note: Requires verifyJWT"
          }
        }
      ]
    }
  ]
};

const environment = {
  name: "StreamPulse Backend Environment",
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

fs.writeFileSync('StreamPulse.postman_collection.json', JSON.stringify(collection, null, 2));
fs.writeFileSync('projectX-backend.postman_collection.json', JSON.stringify(collection, null, 2));
fs.writeFileSync('postman_environment.json', JSON.stringify(environment, null, 2));

console.log("StreamPulse Postman collection & environment successfully written!");
