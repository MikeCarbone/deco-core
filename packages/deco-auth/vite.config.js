import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			// Could also be a dictionary or array of multiple entry points
			entry: "src/app.js",
			name: "MyLib",
			// the proper extensions will be added
			fileName: "my-lib",
			formats: ["es"],
		},
		outDir: "dist", // specify the output directory
		assetsDir: "", // assets will be served from the root of the dist directory
		rollupOptions: {
			external: ["crypto"],
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name].[ext]",
			},
			input: {
				// define your entry points here
				app: "src/app.js",
			},
		},
	},
});
