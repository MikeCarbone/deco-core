import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000; // You can use any port you prefer

const handler = async (req, res) => {
	let { pluginName, versionNumber, file } = req.params;
	file = file || "manifest.json";

	// We can specify latest if we always want to pull the latest version
	// e.g. /plugins/deco-auth/latest
	const useLatest = versionNumber.toLowerCase() === "latest";

	// Path of the plugin in public folder
	const pluginPath = path.join(__dirname, "public", "plugins", pluginName);

	if (useLatest) {
		// Fetch last in array
		const versions = await fs.readdir(pluginPath);
		// Default sort actually works for array of stringified version numbers
		versionNumber = versions.sort()[versions.length - 1];
	}

	const filePath = path.join(pluginPath, versionNumber, file);

	// Only allow our expected files
	if (file !== "app.js" && file !== "manifest.json") {
		return res.status(404).send("File not found");
	}

	// Don't send anything that might get copied by accident
	if (!pluginName.startsWith("deco-")) {
		return res.status(404).send("File not found");
	}

	// No trying to navigate out of our shit, we handle routing
	if (filePath.indexOf("..") > -1) {
		return res.status(404).send("File not found");
	}

	// Send the file
	return res.sendFile(filePath, (err) => {
		if (err) {
			res.status(404).send("File not found");
		}
	});
};

// Define the routes, file not necessary (default to manifest)
app.get("/plugins/:pluginName/:versionNumber/:file", handler);
app.get("/plugins/:pluginName/:versionNumber", handler);

// Start the server
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
