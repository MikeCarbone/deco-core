export const tables = () => ({
	permissions: {
		table_name: "permissions",
	},
});

export const onInstall = () => {
	return [
		() => {
			return [
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
				summary: "Create a permission",
				operationId: "createPermission",
				execution: async ({ req }) => {
					const {
						domain,
						resource,
						method,
						expiration,
						plugin_name,
					} = req.body;
					let futureExpiration = expiration;
					if (!futureExpiration) {
						const today = new Date();
						let oneYearLater = new Date(today);
						oneYearLater.setFullYear(today.getFullYear() + 1);
						futureExpiration = oneYearLater.getTime();
					}
					return [
						() => {
							return [
								{
									statement: `INSERT INTO permissions (id, domain, resource, method, plugin_name, expires) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
									data_key: "newPermission",
									values: [
										domain.toUpperCase(),
										resource.toUpperCase(),
										method.toUpperCase(),
										plugin_name,
										futureExpiration,
									],
								},
							];
						},
					];
				},
			},
			get: {
				summary: "Fetch permissions",
				operationId: "fetchPermissions",
				execution: ({ req }) => {
					const { resource, method, domain } = req.query;
					return [
						() => {
							return [
								{
									statement: `SELECT * FROM permissions WHERE resource = $1 AND method = $2 AND domain = $3;`,
									data_key: "permissions",
									values: [
										resource?.toUpperCase(),
										method?.toUpperCase(),
										domain?.toUpperCase(),
									],
								},
							];
						},
					];
				},
				handleReturn: ({ memory }) => {
					const { permissions } = memory;
					return {
						status: 200,
						data: permissions?.rows,
					};
				},
			},
		},
	},
	components: {
		schemas: {
			Permission: {
				type: "object",
				properties: {
					id: {
						type: "string",
						format: "uuid",
						description:
							"The unique identifier for the permission.",
					},
					domain: {
						type: "string",
						description:
							"The domain associated with the permission.",
					},
					resource: {
						type: "string",
						description:
							"The resource for which the permission is granted.",
					},
					plugin_name: {
						type: "string",
						description:
							"The name of the plugin granting the permission.",
					},
					method: {
						type: "string",
						description:
							"The HTTP method for which the permission is granted (e.g., GET, POST).",
					},
					expires: {
						type: "string",
						format: "date-time",
						description:
							"The timestamp when the permission expires.",
					},
					created_at: {
						type: "string",
						format: "date-time",
						description:
							"The timestamp when the permission was created.",
					},
				},
				required: [
					"id",
					"domain",
					"resource",
					"plugin_name",
					"method",
					"expires",
					"created_at",
				],
				example: {
					id: "123e4567-e89b-12d3-a456-426614174002",
					domain: "example.com",
					resource: "/api/data",
					plugin_name: "sample_plugin",
					method: "GET",
					expires: "2023-12-31T23:59:59Z",
					created_at: "2023-01-01T12:00:00Z",
				},
			},
		},
	},
};
