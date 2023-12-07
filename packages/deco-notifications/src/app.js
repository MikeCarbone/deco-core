export const tables = () => ({
	notifications: {
		table_name: "notifications",
	},
});

export const onInstall = ({ plugins }) => {
	return [
		() => {
			return [
				{
					statement: `CREATE TABLE notifications (
						id UUID PRIMARY KEY,
						plugin_id UUID,
						message TEXT,
						is_read BOOLEAN DEFAULT FALSE,
						created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
						link VARCHAR(255),
						expiry_date DATE,
						FOREIGN KEY (plugin_id) REFERENCES ${plugins[
							"deco-plugins"
						].tables.plugins.getTableName()}(id)
					);`,
					data_key: "notificationsTable",
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
				summary: "Create a notification",
				operationId: "createNotification",
				execution: async ({ req }) => {
					const { plugin_id, message, link, expiry_date } = req.body;
					return [
						() => {
							return [
								{
									statement: `INSERT INTO notifications (id, plugin_id, message, link, expiry_date) VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
									data_key: "newPermission",
									values: [
										plugin_id,
										message,
										link,
										expiry_date,
									],
								},
							];
						},
					];
				},
			},
			get: {
				summary: "Fetch notifications",
				operationId: "fetchNotifications",
				execution: () => {
					return [
						() => {
							return [
								{
									statement: `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50;`,
									data_key: "notifications",
									values: [],
								},
							];
						},
					];
				},
				handleReturn: ({ memory }) => {
					const { notifications } = memory;
					return {
						status: 200,
						data: notifications.rows,
					};
				},
			},
		},
		"/{id}": {
			patch: {
				summary: "Update notification",
				operationId: "fetchNotifications",
				execution: ({ req }) => {
					const { id, is_read } = req.body;
					return [
						() => {
							return [
								{
									statement: `UPDATE ${
										tables().notifications.table_name
									} SET is_read = $2 WHERE id = $1;`,
									data_key: "updateNotification",
									values: [id, is_read],
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
			Notification: {
				type: "object",
				properties: {
					id: {
						type: "string",
						format: "uuid",
						description:
							"Unique identifier for the notification (UUID)",
					},
					plugin_id: {
						type: "string",
						format: "uuid",
						description:
							"Unique identifier for the associated plugin (UUID)",
					},
					message: {
						type: "string",
						description: "Notification message",
					},
					is_read: {
						type: "boolean",
						default: false,
						description:
							"Flag indicating whether the notification has been read",
					},
					created_at: {
						type: "string",
						format: "date-time",
						description:
							"Timestamp indicating the creation date of the notification",
					},
					link: {
						type: "string",
						maxLength: 255,
						description: "Link associated with the notification",
					},
					expiry_date: {
						type: "string",
						format: "date",
						description:
							"Date indicating the expiry date of the notification",
					},
				},
				required: ["id", "plugin_id", "message", "created_at"],
				foreignKeys: [
					{
						name: "fk_plugin_id",
						foreignTable: "plugins",
						foreignField: "id",
						onUpdate: "CASCADE",
						onDelete: "CASCADE",
					},
				],
			},
		},
	},
};
