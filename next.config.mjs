/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/actions.json",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-action-version, x-blockchain-ids" },
        ],
      },
      {
        source: "/api/actions/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Content-Encoding, Accept-Encoding, x-accept-action-version, x-action-version, x-blockchain-ids" },
          { key: "Access-Control-Expose-Headers", value: "x-action-version, x-blockchain-ids" }
        ],
      }
    ];
  },
};

export default nextConfig;
