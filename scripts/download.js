const fs = require("fs").promises;
const path = require("path");

const wearablesDir = path.join("./wearables");
const manifestFile = path.join("./manifest.json");

const skipExisting = true;

const run = async () => {
  await fs.mkdir(wearablesDir, { recursive: true });
  const manifestData = await fs.readFile(manifestFile, "utf-8");
  const manifest = JSON.parse(manifestData);
  const paths = manifest.manifest.paths;
  const keys = Object.keys(paths);
  const items = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const fileName = key.replace("/", "_");
    const file = path.join(wearablesDir, fileName);
    const exists = await checkExists(file);
    if (exists && skipExisting) continue;
    const num = i + 1;
    const id = paths[key].id;
    const url = `https://arweave.net/${id}`;
    items.push({ num, id, url, file });
  }
  const download = async (item) => {
    console.log(`(${item.num}/${keys.length}) downloading: ${item.url}`);
    const resp = await fetch(item.url);
    const data = await resp.text();
    await fs.writeFile(item.file, data, "utf-8");
  };
  const queue = new Set();
  const maxParallel = 50;
  const checkQueue = () => {
    while (items.length && queue.size < maxParallel) {
      const item = items.shift();
      const promise = download(item);
      queue.add(promise);
      promise.then(() => {
        queue.delete(promise);
        checkQueue();
      });
    }
  };
  checkQueue();
};
run();

const checkExists = async (file) => {
  try {
    await fs.stat(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};
