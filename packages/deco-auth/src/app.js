export const tables = () => ({
	permissions: {
		table_name: "permissions",
	},
});

export const onInstall = () => {
	return [
		() => {
			return [];
		},
	];
};

export const endpoints = {
	paths: {
		"/login": {
			post: {
				summary: "Login a user",
				operationId: "loginUser",
				execution: ({ req, res }) => {
					console.log(res.locals);
					// sendCookie
					// const options = { expiresIn: '365d' };
					// const payload = {
					// 	user: req.user,
					// 	fromApp: true,
					// };
					// const authToken = jwt.sign(
					// 	payload,
					// 	process.env.AUTH_SECRET,
					// 	options
					// );
					// res.setHeader(
					// 	"Set-Cookie",
					// 	cookie.serialize("XSRF-TOKEN", authToken, {
					// 		httpOnly: true,
					// 		sameSite: "Lax",
					// 		path: "/",
					// 		secure: process.env.MODE === "dev" ? false : true,
					// 		maxAge: 60 * 60 * 24 * 7 * 52, // 1 year
					// 	})
					// );
				},
			},
		},
	},
	components: {
		schemas: {
			User: {
				type: "object",
				properties: {
					id: {
						type: "string",
						format: "uuid",
						description: "Unique identifier for the user",
					},
					password: {
						type: "string",
						minLength: 8,
						description: "User password (hashed or encrypted)",
					},
					is_owner: {
						type: "boolean",
						default: false,
						description: "Indicates if the user is an owner",
					},
					permissions: {
						type: "object",
						description: "User permissions",
						properties: {
							read: {
								type: "boolean",
								default: false,
								description: "Permission to read",
							},
							write: {
								type: "boolean",
								default: false,
								description: "Permission to write",
							},
						},
					},
					user_details: {
						type: "object",
						description: "Details about the user",
						properties: {
							full_name: {
								type: "string",
								minLength: 1,
								description: "Full name of the user",
							},
							email: {
								type: "string",
								format: "email",
								description: "Email address of the user",
							},
						},
					},
					created_at: {
						type: "string",
						format: "date-time",
						description: "Timestamp when the user was created",
					},
				},
				required: ["id", "password"],
			},
		},
	},
};
