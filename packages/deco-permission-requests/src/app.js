export const tables = () => ({
	permissionRequests: {
		table_name: "permission_requests",
	},
});

export const onInstall = () => {
	return [
		() => {
			return [
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
					values: [],
				},
			];
		},
	];
};

export const endpoints = {
	paths: {
		"/": {
			post: {
				summary: "Create a permission request",
				operationId: "createPermissionRequest",
				execution: async ({ req }) => {
					const {
						domain,
						resource,
						plugin_name,
						method,
						suggested_expiration,
					} = req.body;
					return [
						() => {
							return [
								{
									statement: `INSERT INTO permission_requests (id, domain, resource, method, name, suggested_expiration) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
									data_key: "newPermission",
									values: [
										domain.toUpperCase(),
										resource.toUpperCase(),
										method.toUpperCase(),
										plugin_name,
										suggested_expiration,
									],
								},
							];
						},
					];
				},
			},
			get: {
				summary: "Fetch permission requests",
				operationId: "fetchPermissionReqests",
				execution: (req) => {
					const { resource, method, domain } = req.query;
					return [
						() => {
							return [
								{
									statement: `SELECT * FROM permission_requests WHERE resource=$1, method=$2, domain=$3`,
									data_key: "permissions",
									values: [
										resource.toUpperCase(),
										method.toUpperCase(),
										domain.toUpperCase(),
									],
								},
							];
						},
					];
				},
			},
		},
		"/{id}": {
			get: {
				summary: "Get a permission request record",
				operationId: "getPermissionRequest",
				execution: ({ req }) => {
					const { id } = req.params;
					return [
						() => {
							return [
								{
									statement: `SELECT * FROM permission_requests WHERE id=$1`,
									data_key: "permissionRecord",
									values: [id],
								},
							];
						},
					];
				},
				handleReturn: ({ memory }) => {
					const { permissionRecord } = memory;
					if (permissionRecord?.rows[0]) {
						return {
							status: 200,
							data: permissionRecord?.rows[0],
						};
					}
					return {
						status: 404,
						data: null,
					};
				},
			},
			delete: {
				summary: "Deletes a permission request record",
				operationId: "deletePermissionRequest",
				execution: ({ req }) => {
					const { id } = req.params;
					return [
						() => {
							return [
								{
									statement: `DELETE FROM permission_requests WHERE id=$1`,
									data_key: "permissionDelete",
									values: [id],
								},
							];
						},
					];
				},
			},
		},
		"/{id}/accept": {
			post: {
				summary: "Accept a permission request",
				operationId: "acceptPermissionRequest",
				execution: async (context) => {
					const { req, res, plugins, runRoute } = context;
					const expiration = req.body?.expiration;
					// Create permission
					const { data: record } = await runRoute(
						context,
						endpoints.paths["/{id}"].get
					);
					if (record) {
						await plugins[
							"deco-permissions"
						].operations.createPermission({
							res,
							req: {
								...req,
								body: {
									domain: record.domain,
									resource: record.resource,
									method: record.method,
									expiration:
										expiration ||
										record.suggested_expiration,
									plugin_name: record.plugin_name,
								},
							},
						});
						// Delete permission request
						return await runRoute(
							context,
							endpoints.paths["/{id}"].delete
						);
					}
					return res
						.status(404)
						.send({ message: "Record not found" });
				},
			},
		},
	},
	components: {
		schemas: {
			PermissionRequest: {
				type: "object",
				properties: {
					id: {
						type: "string",
						format: "uuid",
						description:
							"The unique identifier for the permission request.",
					},
					domain: {
						type: "string",
						description:
							"The domain associated with the permission request.",
					},
					resource: {
						type: "string",
						description:
							"The resource for which permission is requested.",
					},
					plugin_name: {
						type: "string",
						description:
							"The name of the plugin making the permission request.",
					},
					method: {
						type: "string",
						description:
							"The HTTP method for which permission is requested (e.g., GET, POST).",
					},
					suggested_expiration: {
						type: "string",
						format: "date-time",
						description:
							"The suggested expiration timestamp for the permission.",
					},
					created_at: {
						type: "string",
						format: "date-time",
						description:
							"The timestamp when the permission request was created.",
					},
				},
				required: [
					"id",
					"domain",
					"resource",
					"plugin_name",
					"method",
					"created_at",
				],
				example: {
					id: "123e4567-e89b-12d3-a456-426614174001",
					domain: "example.com",
					resource: "/api/data",
					plugin_name: "sample_plugin",
					method: "GET",
					suggested_expiration: "2023-12-31T23:59:59Z",
					created_at: "2023-01-01T12:00:00Z",
				},
			},
		},
	},
};
