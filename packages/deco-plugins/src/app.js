import crypto from "crypto";

export const tables = () => ({
	plugins: {
		table_name: "plugins",
	},
	installRequests: {
		table_name: "install_requests",
	},
});

const getFormattedRoutes = (routes) => ({
	routes: routes.map((r) => ({
		path: r.path,
		method: r.method,
		summary: r?.summary,
		operation_id: r?.operationId,
		privacy: r?.privacy || "PRIVATE",
	})),
});

function encryptSecret(text, key, iv) {
	const cipher = crypto.createCipheriv(
		"aes-256-cbc",
		Buffer.from(key, "hex"),
		Buffer.from(iv, "hex")
	);
	let encrypted = cipher.update(text, "utf-8", "hex");
	encrypted += cipher.final("hex");
	return encrypted;
}

export const onInstall = () => {
	return [
		() => {
			return [
				{
					statement: `CREATE TABLE ${tables().plugins.table_name} (
						id UUID PRIMARY KEY,
						name VARCHAR(255),
						manifest_uri VARCHAR(255),
						permissions JSONB,
						core_key VARCHAR(255),
						routes JSONB,
						secrets JSONB,
						initialization_vector VARCHAR(255),
						installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
					);`,
					data_key: "pluginsTable",
					values: [],
				},
				{
					statement: `CREATE TABLE ${
						tables().installRequests.table_name
					} (
						id UUID PRIMARY KEY,
						manifest_uri VARCHAR(255),
						requested_by_uri VARCHAR(255),
						created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
					);`,
					data_key: "installationRequestsTable",
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
				summary: "Create a record of a plugin installation",
				operationId: "createInstallationRecord",
				execution: async ({ req, res, runStatement }) => {
					const data = await runStatement({
						statement: `SELECT * FROM ${
							tables().plugins.table_name
						} WHERE name=$1`,
						data_key: "existingPlugins",
						values: [req.body.name],
					});
					const existingPlugins = data.existingPlugins.rows;
					if (existingPlugins?.length) {
						return res
							.status(400)
							.send({ message: "Plugin name already exists." });
					}

					// We should flatten routes here and save them with public/private field

					const {
						id,
						name,
						manifest_uri,
						permissions = [],
						core_key,
						routes,
					} = req.body;

					const formattedRoutes = getFormattedRoutes(routes);

					// This will be a per-plugin encryption key used for secrets management
					const initializationVector = crypto
						.randomBytes(16)
						.toString("hex");

					return [
						() => {
							return [
								{
									statement: `INSERT INTO ${
										tables().plugins.table_name
									} (id, name, manifest_uri, permissions, core_key, routes, secrets, initialization_vector) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
									data_key: "newPlugin",
									values: [
										id,
										name,
										manifest_uri,
										permissions,
										core_key,
										formattedRoutes,
										{},
										initializationVector,
									],
								},
							];
						},
					];
				},
			},
			get: {
				summary: "Fetch all plugin installation records",
				operationId: "fetchInstallationRecords",
				execution: () => {
					return [
						() => {
							return [
								{
									statement: `SELECT * FROM ${
										tables().plugins.table_name
									};`,
									data_key: "allPlugins",
									values: [],
								},
							];
						},
					];
				},
				handleReturn: ({ memory }) => {
					return {
						status: 200,
						data: memory?.allPlugins.rows,
					};
				},
			},
		},
		"/{id}": {
			delete: {
				summary: "Delete an plugin installation record",
				operationId: "deleteInstallationRecord",
				execution: ({ req }) => {
					const { id } = req.params;
					return [
						() => {
							return [
								{
									statement: `DELETE FROM ${
										tables().plugins.table_name
									} WHERE id = $1;`,
									data_key: "deletedInstallationRecord",
									values: [id],
								},
							];
						},
					];
				},
			},
			get: {
				summary: "Fetch plugin installation record",
				operationId: "getInstallationRecord",
				execution: ({ req }) => {
					const { id } = req.params;
					return [
						() => {
							return [
								{
									statement: `SELECT * FROM ${
										tables().plugins.table_name
									} WHERE id = $1;`,
									data_key: "fetchedInstallationRecord",
									values: [id],
								},
							];
						},
					];
				},
				handleReturn: ({ memory }) => {
					const { fetchedInstallationRecord } = memory;
					if (fetchedInstallationRecord?.rows) {
						return {
							data: fetchedInstallationRecord?.rows[0],
							status: 200,
						};
					} else {
						return {
							data: null,
							status: 404,
						};
					}
				},
			},
			patch: {
				summary: "Update a plugin installation record",
				operationId: "updateInstallationRecord",
				execution: ({ req }) => {
					const { id } = req.params;
					const { manifest_uri, permissions, core_key, routes } =
						req.body;

					const formattedRoutes = getFormattedRoutes(routes);

					return [
						() => {
							return [
								{
									statement: `UPDATE ${
										tables().plugins.table_name
									} SET manifest_uri = $2, permissions = $3, core_key = $4, routes = $5
									WHERE id = $1;`,
									data_key: "updatedInstallationRecord",
									values: [
										id,
										manifest_uri,
										permissions,
										core_key,
										formattedRoutes,
									],
								},
							];
						},
					];
				},
			},
		},
		"/{id}/secrets": {
			post: {
				summary: "Save a plugin secret",
				operationId: "savePluginSecret",
				execution: async (ctx) => {
					const { req, res, runRoute } = ctx;
					const { id } = req.params;
					const { key, value } = req.body;
					const encryptionToken =
						res.locals._server.encryption_string;
					const { data } = await runRoute(
						ctx,
						endpoints.paths["/{id}"].get
					);
					const secrets = data.secrets;
					const encryptedValue = encryptSecret(
						value,
						encryptionToken,
						data.initialization_vector
					);
					secrets[key] = encryptedValue;
					data.secrets = secrets;
					return [
						() => {
							return [
								{
									statement: `UPDATE ${
										tables().plugins.table_name
									} SET secrets = $1 WHERE id = $2`,
									data_key: "secretSaveRecord",
									values: [secrets, id],
								},
							];
						},
					];
				},
				handleReturn: ({ memory }) => {
					const { secretSaveRecord } = memory;
					if (secretSaveRecord?.rowCount > 0) {
						return {
							status: 200,
							data: null,
						};
					}
					return {
						status: 500,
						data: null,
					};
				},
			},
		},
		"/install-requests": {
			post: {
				summary: "Request a plugin be installed",
				operationId: "requestPluginInstall",
				privacy: "PUBLIC",
				execution: async (ctx) => {
					const { req, plugins } = ctx;
					const { manifest_uri } = req.body;
					const requestedByUri = req.get("host");
					const manifestRes = await fetch(manifest_uri);
					if (!manifestRes.ok) {
						return {
							status: 500,
							data: null,
							message: "Manifest JSON could not be fetched",
						};
					}
					const manifest = await manifestRes.json();

					// Example of an optional dependency
					if (plugins["deco-notifications"]) {
						await plugins[
							"deco-notifications"
						].operations.createNotification({
							...ctx,
							req: {
								...ctx.req,
								body: {
									plugin_id: plugins._currentPlugin.id,
									message: `${requestedByUri} wants to install ${manifest.name} from ${manifest_uri}`,
								},
							},
						});
					}

					return [
						() => {
							return [
								{
									statement: `INSERT INTO ${
										tables().installRequests.table_name
									} (id, manifest_uri, requested_by_uri) VALUES (gen_random_uuid(), $1, $2)`,
									data_key: "installRequest",
									values: [manifest_uri, requestedByUri],
								},
							];
						},
					];
				},
			},
		},
		"/install-requests/{id}": {
			delete: {
				summary: "Delete an installation request",
				operationId: "deleteInstallRequest",
				execution: async ({ req }) => {
					const { id } = req.params;
					return [
						() => {
							return [
								{
									statement: `DELETE FROM ${
										tables().installRequests.table_name
									} WHERE id = $1`,
									data_key: "installRequest",
									values: [id],
								},
							];
						},
					];
				},
			},
		},
	},
	components: {
		schemas: {
			Plugin: {
				type: "object",
				properties: {
					id: {
						type: "string",
						format: "uuid",
						description: "The unique identifier for the plugin.",
					},
					name: {
						type: "string",
						description: "The name of the plugin.",
					},
					manifest_uri: {
						type: "string",
						description:
							"The URI of the manifest associated with the plugin.",
					},
					permissions: {
						type: "object",
						description: "Permissions associated with the plugin.",
						example: {},
					},
					core_key: {
						type: "string",
						description: "The core key associated with the plugin.",
					},
					routes: {
						type: "object",
						description: "Routes associated with the plugin.",
						example: {},
					},
					secrets: {
						type: "object",
						description: "Secrets associated with the plugin.",
						example: {},
					},
					initialization_vector: {
						type: "string",
						description:
							"The initialization vector associated with the plugin.",
					},
					installed_at: {
						type: "string",
						format: "date-time",
						description:
							"The timestamp when the plugin was installed.",
						default: "CURRENT_TIMESTAMP",
					},
				},
				required: [
					"id",
					"name",
					"manifest_uri",
					"permissions",
					"core_key",
					"routes",
					"secrets",
					"initialization_vector",
					"installed_at",
				],
			},
			InstallRequest: {
				type: "object",
				properties: {
					id: {
						type: "string",
						format: "uuid",
						description:
							"The unique identifier for the install request.",
					},
					manifest_uri: {
						type: "string",
						description:
							"The URI of the manifest associated with the install request.",
					},
					requested_by_uri: {
						type: "string",
						description:
							"The URI of the entity that requested the installation.",
					},
					created_at: {
						type: "string",
						format: "date-time",
						description:
							"The timestamp when the install request was created.",
						default: "CURRENT_TIMESTAMP",
					},
				},
				required: [
					"id",
					"manifest_uri",
					"requested_by_uri",
					"created_at",
				],
			},
		},
	},
};
