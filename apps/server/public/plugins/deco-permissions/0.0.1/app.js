const a = () => ({
  permissions: {
    table_name: "permissions"
  },
  permissionRequests: {
    table_name: "permission_requests"
  }
}), d = () => [
  () => [
    {
      statement: `CREATE TABLE permissions (
						id UUID PRIMARY KEY,
						domain VARCHAR(255),
						resource VARCHAR(255),
						plugin_name VARCHAR(255),
						method VARCHAR(255),
						expires TIMESTAMP,
						created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
					);`,
      data_key: "permissionsTable",
      values: []
    },
    {
      statement: `CREATE TABLE permission_requests (
						id UUID PRIMARY KEY,
						domain VARCHAR(255),
						resource VARCHAR(255),
						plugin_name VARCHAR(255),
						method VARCHAR(255),
						suggested_expiration TIMESTAMP,
						created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
					);`,
      data_key: "permissionRequestTable",
      values: []
    }
  ]
], p = {
  paths: {
    "/": {
      post: {
        summary: "Create a permission",
        operationId: "createPermission",
        execution: async ({ req: t }) => {
          const {
            domain: e,
            resource: i,
            method: s,
            expiration: o,
            plugin_name: r
          } = t.body;
          let n = o;
          if (!n) {
            const m = /* @__PURE__ */ new Date();
            let u = new Date(m);
            u.setFullYear(m.getFullYear() + 1), n = u.toISOString();
          }
          return [
            () => [
              {
                statement: `INSERT INTO ${a().permissions.table_name} (id, domain, resource, method, plugin_name, expires) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
                data_key: "newPermission",
                values: [
                  e.toUpperCase(),
                  i.toUpperCase(),
                  s.toUpperCase(),
                  r,
                  n
                ]
              }
            ]
          ];
        }
      },
      get: {
        summary: "Fetch permissions",
        operationId: "fetchPermissions",
        execution: ({ req: t }) => {
          let { resource: e, method: i, domain: s } = t.query;
          return e.charAt(e.length - 1) === "/" && (e = e.slice(0, -1)), [
            () => [
              {
                statement: `SELECT * FROM ${a().permissions.table_name} WHERE resource = $1 AND method = $2 AND domain = $3;`,
                data_key: "permissions",
                values: [
                  e == null ? void 0 : e.toUpperCase(),
                  i == null ? void 0 : i.toUpperCase(),
                  s == null ? void 0 : s.toUpperCase()
                ]
              }
            ]
          ];
        },
        handleReturn: ({ memory: t }) => {
          const { permissions: e } = t;
          return {
            status: 200,
            data: e == null ? void 0 : e.rows
          };
        }
      }
    },
    "/requests": {
      post: {
        summary: "Create a permission request",
        operationId: "createPermissionRequest",
        privacy: "PUBLIC",
        execution: async ({ req: t }) => {
          let { resource: e, method: i, suggested_expiration: s } = t.body;
          const o = t.get("host").toUpperCase();
          if (e.charAt(0) !== "/")
            return {
              status: 400,
              error: "Resource must being with a /"
            };
          const r = e.split("/")[2];
          return e.charAt(e.length - 1) === "/" && (e = e.slice(0, -1)), [
            () => [
              {
                statement: `INSERT INTO ${a().permissionRequests.table_name} (id, domain, resource, method, plugin_name, suggested_expiration) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
                data_key: "newPermission",
                values: [
                  o.toUpperCase(),
                  e.toUpperCase(),
                  i.toUpperCase(),
                  r.toLowerCase(),
                  s
                ]
              }
            ]
          ];
        }
      },
      get: {
        summary: "Fetch permission requests",
        operationId: "fetchPermissionReqests",
        execution: (t) => {
          const { resource: e, method: i, domain: s } = t.query;
          return [
            () => [
              {
                statement: `SELECT * FROM ${a().permissionRequests.table_name} WHERE resource=$1, method=$2, domain=$3`,
                data_key: "permissions",
                values: [
                  e.toUpperCase(),
                  i.toUpperCase(),
                  s.toUpperCase()
                ]
              }
            ]
          ];
        }
      }
    },
    "/requests/{id}": {
      get: {
        summary: "Get a permission request record",
        operationId: "getPermissionRequest",
        execution: ({ req: t }) => {
          const { id: e } = t.params;
          return [
            () => [
              {
                statement: `SELECT * FROM ${a().permissionRequests.table_name} WHERE id=$1`,
                data_key: "permissionRecord",
                values: [e]
              }
            ]
          ];
        },
        handleReturn: ({ memory: t }) => {
          const { permissionRecord: e } = t;
          return e != null && e.rows[0] ? {
            status: 200,
            data: e == null ? void 0 : e.rows[0]
          } : {
            status: 404,
            data: null
          };
        }
      },
      delete: {
        summary: "Deletes a permission request record",
        operationId: "deletePermissionRequest",
        execution: ({ req: t }) => {
          const { id: e } = t.params;
          return [
            () => [
              {
                statement: `DELETE FROM ${a().permissionRequests.table_name} WHERE id=$1`,
                data_key: "permissionDelete",
                values: [e]
              }
            ]
          ];
        }
      }
    },
    "/requests/{id}/accept": {
      post: {
        summary: "Accept a permission request",
        operationId: "acceptPermissionRequest",
        execution: async (t) => {
          var n;
          const { req: e, res: i, runRoute: s } = t, o = (n = e.body) == null ? void 0 : n.expiration, { data: r } = await s(
            t,
            p.paths["/requests/{id}"].get
          );
          return r ? (await s(
            {
              ...t,
              req: {
                ...e,
                body: {
                  domain: r.domain,
                  resource: r.resource,
                  method: r.method,
                  expiration: o || r.suggested_expiration,
                  plugin_name: r.plugin_name
                }
              }
            },
            p.paths["/"].post
          ), await s(
            t,
            p.paths["/requests/{id}"].delete
          )) : i.status(404).send({ message: "Record not found" });
        }
      }
    }
  },
  components: {
    schemas: {
      Permission: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "The unique identifier for the permission."
          },
          domain: {
            type: "string",
            description: "The domain associated with the permission."
          },
          resource: {
            type: "string",
            description: "The resource for which the permission is granted."
          },
          plugin_name: {
            type: "string",
            description: "The name of the plugin granting the permission."
          },
          method: {
            type: "string",
            description: "The HTTP method for which the permission is granted (e.g., GET, POST)."
          },
          expires: {
            type: "string",
            format: "date-time",
            description: "The timestamp when the permission expires."
          },
          created_at: {
            type: "string",
            format: "date-time",
            description: "The timestamp when the permission was created."
          }
        },
        required: [
          "id",
          "domain",
          "resource",
          "plugin_name",
          "method",
          "expires",
          "created_at"
        ],
        example: {
          id: "123e4567-e89b-12d3-a456-426614174002",
          domain: "example.com",
          resource: "/api/data",
          plugin_name: "sample_plugin",
          method: "GET",
          expires: "2023-12-31T23:59:59Z",
          created_at: "2023-01-01T12:00:00Z"
        }
      },
      PermissionRequest: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "The unique identifier for the permission request."
          },
          domain: {
            type: "string",
            description: "The domain associated with the permission request."
          },
          resource: {
            type: "string",
            description: "The resource for which permission is requested."
          },
          plugin_name: {
            type: "string",
            description: "The name of the plugin making the permission request."
          },
          method: {
            type: "string",
            description: "The HTTP method for which permission is requested (e.g., GET, POST)."
          },
          suggested_expiration: {
            type: "string",
            format: "date-time",
            description: "The suggested expiration timestamp for the permission."
          },
          created_at: {
            type: "string",
            format: "date-time",
            description: "The timestamp when the permission request was created."
          }
        },
        required: [
          "id",
          "domain",
          "resource",
          "plugin_name",
          "method",
          "created_at"
        ],
        example: {
          id: "123e4567-e89b-12d3-a456-426614174001",
          domain: "example.com",
          resource: "/api/data",
          plugin_name: "sample_plugin",
          method: "GET",
          suggested_expiration: "2023-12-31T23:59:59Z",
          created_at: "2023-01-01T12:00:00Z"
        }
      }
    }
  }
};
export {
  p as endpoints,
  d as onInstall,
  a as tables
};
