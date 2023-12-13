import crypto from "crypto";
import cookie from "cookie";
import { createSigner, createVerifier } from "fast-jwt";

export const tables = () => ({
	users: {
		table_name: "users",
	},
});

export const onInstall = () => {
	return [
		() => {
			return [
				{
					statement: `CREATE TABLE users (
						id UUID PRIMARY KEY,
						salt VARCHAR(255),
						hash VARCHAR(255),
						permissions JSONB,
						user_details JSONB,
						subdomain VARCHAR(75) NOT NULL UNIQUE DEFAULT 'root',
						created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
					);`,
					data_key: "usersTable",
					values: [],
				},
			];
		},
	];
};

// Function to check if a provided password matches the stored hash
function verifyPassword(password, salt, storedHash) {
	const hashedAttempt = crypto.scryptSync(password, salt, 32).toString("hex");
	return hashedAttempt === storedHash;
}

export const endpoints = {
	paths: {
		"/": {
			post: {
				summary: "Create a server user",
				operationId: "createUser",
				execution: async ({ req, res }) => {
					const { password, subdomain } = req.body;
					const { isRootUser, isServer, _user } = res.locals;

					// Only the root user can create a new user
					// the _user.id check ensures that this is coming from a login method of auth

					if (!isServer) {
						if (!isRootUser && !_user?.id) {
							return { status: 401, data: null };
						}
					}

					if (password.length < 15) {
						return res.status(400).send({
							message: "Password length too short.",
						});
					}

					// Generate a salt
					const salt = crypto.randomBytes(16).toString("hex");

					// Hash the password with the generated salt
					const hashed = crypto
						.scryptSync(password, salt, 32)
						.toString("hex");

					return [
						() => {
							return [
								{
									statement: `INSERT INTO users (id, subdomain, hash, salt, permissions, user_details) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
									data_key: "newUser",
									values: [subdomain, hashed, salt, {}, {}],
								},
							];
						},
					];
				},
				handleReturn: ({ memory }) => {
					const { newUser } = memory;
					if (newUser.rows[0]) {
						return {
							status: 200,
							data: newUser?.rows[0],
						};
					}
					return {
						status: 500,
						data: null,
					};
				},
			},
			get: {
				summary: "Fetch all server users",
				operationId: "fetchUsers",
				execution: () => {
					return [
						() => {
							return [
								{
									statement: `SELECT * FROM users`,
									data_key: "allUsers",
									values: [],
								},
							];
						},
					];
				},
			},
		},
		"/login": {
			post: {
				summary: "Login a user",
				operationId: "loginUser",
				privacy: "PUBLIC",
				execution: async ({ req, res, secrets }) => {
					const { salt, hash, id } = res.locals?._user;
					const isCorrectPassword = verifyPassword(
						req.body?.password,
						salt,
						hash
					);
					if (!isCorrectPassword) {
						return {
							status: 401,
							data: null,
							message: "Incorrect password.",
						};
					}

					// Define the payload of the JWT
					const payload = {
						// Subject identifier
						sub: id,
						user: { id },
						iat: Math.floor(Date.now() / 1000), // Issued At
						exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expires in 1 hour
					};
					const signSync = createSigner({
						key: res.locals._server.login_jwt_key,
					});
					const token = signSync(payload);

					res.setHeader(
						"Set-Cookie",
						cookie.serialize("XSRF-TOKEN", token, {
							httpOnly: true,
							sameSite: "Lax",
							path: "/",
							secure: process.env.MODE === "dev" ? false : true,
							maxAge: 60 * 60 * 24 * 7 * 52, // 1 year
						})
					);

					return {
						status: 200,
						data: token,
					};
				},
			},
		},
		"/authenticate": {
			get: {
				summary: "Verify the presence of an authentication cookie",
				operationId: "verifyAuthCookie",
				privacy: "PUBLIC",
				execution: async ({ req, res }) => {
					const key = res.locals._server.login_jwt_key;
					const cookies = cookie.parse(req.headers.cookie || "");
					const cookieAuthToken = cookies["XSRF-TOKEN"];
					try {
						const decode = createVerifier({ key, complete: true });
						const payload = decode(cookieAuthToken);
						if (!payload) {
							return {
								status: 401,
								data: null,
							};
						}

						return {
							status: 200,
							data: payload,
						};
					} catch (err) {
						return {
							status: 401,
							data: null,
						};
					}
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
