/**
 * This script will be run after packages are built
 * This will setup the folders in their correct spots,
 * and pull in the app.js and manifest.json into their respective
 * version folders
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packagesFolder = path.resolve(__dirname, "../../packages/");
const pluginsFolder = path.resolve(__dirname, "./public/plugins/");

async function createPluginStructure() {
	try {
		// Get list of folder names within the ../../packages/ folder
		const packageFolders = await fs.readdir(packagesFolder);

		// Iterate through each package folder
		for (const packageFolder of packageFolders) {
			// Only target plugin names
			if (!packageFolder.startsWith("deco-")) continue;

			console.log("Pulling in latest versions of ", packageFolder);

			const packagePath = path.join(packagesFolder, packageFolder);

			// Check if the folder also exists within ./public/plugins/
			const pluginExists = await existsInPlugins(packageFolder);

			// If it doesn't exist, create it
			if (!pluginExists) {
				await fs.mkdir(path.join(pluginsFolder, packageFolder));
			}

			// Get version number within package.json
			const version = await getVersion(packagePath);

			// Create a folder within ./public/plugins/folderName with the name being the version number
			const versionFolder = path.join(
				pluginsFolder,
				packageFolder,
				version
			);
			try {
				await fs.access(versionFolder);
				continue;
			} catch (_err) {
				await fs.mkdir(versionFolder);
			}

			// Copy app.js and manifest.json into the version name folder
			const sourcePath = path.join(packagePath, "dist");
			await fs.copyFile(
				path.join(sourcePath, "app.js"),
				path.join(versionFolder, "app.js")
			);
			await fs.copyFile(
				path.join(sourcePath, "manifest.json"),
				path.join(versionFolder, "manifest.json")
			);
		}

		console.log("Packages structure created successfully.");
	} catch (error) {
		console.error("Error:", error.message);
	}
}

// Check if a folder exists within ./public/plugins/
async function existsInPlugins(folderName) {
	const pluginPath = path.join(pluginsFolder, folderName);
	try {
		await fs.stat(pluginPath);
		return true;
	} catch (error) {
		return false;
	}
}

// Get version number within package.json
async function getVersion(packagePath) {
	const packageJsonPath = path.join(packagePath, "package.json");
	try {
		const packageJson = await fs.readFile(packageJsonPath, "utf8");
		const { version } = JSON.parse(packageJson);
		return version;
	} catch (error) {
		throw new Error(`Failed to read version from ${packageJsonPath}`);
	}
}

(async () => {
	try {
		await createPluginStructure();
	} catch (err) {
		console.error(err);
	}
})();

// Get list of folder names within the folder ../../../packages/

// If any of those folder names dont also exist within ./public/plugins/ then create it

// For each of those folder names, get version number within package.json
// and create a folder within ./public/plugins/folderName with the name being the version number,
// for example, ./public/plugins/deco-users/1.0.23

// For each of those folder names, navigate to ../../../packages/folderName/dist
// and copy app.js and manifest.json into the version name folder

// In the end, you should have a directory structure like

// - public
//   - plugins
//     - deco-users
//       - 1.0.3
//         - app.js
//         - manifest.json
//     - deco-plugins
//       - 1.0.5
//         - app.js
//         - manifest.json
