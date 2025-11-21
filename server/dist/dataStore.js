"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeDatabase = exports.readDatabase = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.resolve(__dirname, '../data');
const DB_FILE = path_1.default.join(DATA_DIR, 'db.json');
const SEED_FILE = path_1.default.join(DATA_DIR, 'seed.json');
const ensureDataDir = async () => {
    await fs_1.promises.mkdir(DATA_DIR, { recursive: true });
};
const loadSeed = async () => {
    const seed = await fs_1.promises.readFile(SEED_FILE, 'utf-8');
    return JSON.parse(seed);
};
const readDatabase = async () => {
    await ensureDataDir();
    try {
        const data = await fs_1.promises.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        const seed = await loadSeed();
        await (0, exports.writeDatabase)(seed);
        return seed;
    }
};
exports.readDatabase = readDatabase;
const writeDatabase = async (database) => {
    await ensureDataDir();
    await fs_1.promises.writeFile(DB_FILE, JSON.stringify(database, null, 2), 'utf-8');
};
exports.writeDatabase = writeDatabase;
