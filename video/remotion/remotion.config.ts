// Render settings (video/style.md, Export) and one React for the film: the
// characters come from the app's own components in src/ui/mascots, so the
// bundler resolves react and react-dom to this project's copies.
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setPixelFormat("yuv420p"); // H.264 in yuv420p with BT.709 tags, as players expect
Config.setColorSpace("bt709");
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      react: path.resolve(process.cwd(), "node_modules/react"),
      "react-dom": path.resolve(process.cwd(), "node_modules/react-dom"),
    },
  },
}));
