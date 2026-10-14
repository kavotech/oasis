// This app lives inside the website repo, whose own node_modules (with a
// different React) sits one level up. Block that folder so Metro can never
// resolve into it and bundle two copies of React, while keeping normal
// nested-node_modules lookup inside this project.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const parentModules = path.resolve(__dirname, "..", "node_modules");
const pattern = parentModules
  .split(/[/\\]/)
  .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("[/\\\\]");

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  new RegExp(`^${pattern}[/\\\\].*`),
];

module.exports = config;
