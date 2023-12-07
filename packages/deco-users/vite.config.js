import { defineConfig } from "vite";

export default defineConfig({
	build: {
		target: "node18",
		lib: {
			// Could also be a dictionary or array of multiple entry points
			entry: "src/app.js",
			name: "MyLib",
			// the proper extensions will be added
			fileName: "app",
			formats: ["es"],
		},
		outDir: "dist", // specify the output directory
		rollupOptions: {
			external: ["crypto", "buffer", "node:crypto"],
			output: {
				entryFileNames: "[name].js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name].[ext]",
				format: "es",
			},
			input: {
				// define your entry points here
				app: "src/app.js",
			},
		},
	},
});
