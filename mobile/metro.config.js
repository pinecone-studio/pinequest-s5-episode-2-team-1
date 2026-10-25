// Апп ба API хоёулаа ашигладаг тогтмолууд ../shared-д (shared/gates.ts г.м.): Metro тэр хавтсыг харж, @shared/*-ийг шийднэ.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const shared = path.resolve(__dirname, '../shared');
config.watchFolders = [...(config.watchFolders ?? []), shared];
config.resolver.extraNodeModules = { ...config.resolver.extraNodeModules, '@shared': shared };
module.exports = config;
