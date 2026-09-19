/** @type {import("next").NextConfig} */
const config = {
  // Site estático: sem servidor, sem rewrites, sem i18n.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  devIndicators: false,
};

export default config;
