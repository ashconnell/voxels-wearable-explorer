const fs = require("fs").promises;
const { createReadStream } = require("fs");
const path = require("path");
const unzipper = require("unzipper");

const rawDir = path.join("./raw");
const rawZip = path.join("./raw.zip");
const collectionsDir = path.join("./raw/collections");

async function generate() {
  // unzip raw.zip if it doesn't exist
  const exists = await dirExists(rawDir);
  if (!exists) {
    // console.log("Raw folder not found, unzipping raw.zip");
    await new Promise((resolve) => {
      createReadStream(rawZip)
        .pipe(unzipper.Extract({ path: "./" }))
        .on("close", () => {
          resolve();
        })
        .on("error", (err) => {
          console.error("Error during extraction:", err);
          rejects();
        });
    });
  }
  const wearables = [];
  // get a list of collection id's
  let files;
  try {
    files = await fs.readdir(collectionsDir);
  } catch (err) {
    console.error("Unable to scan collections directory: " + err);
  }
  const collectionIds = files
    .filter((file) => path.extname(file) === ".json")
    .map((file) => path.basename(file, ".json"));
  // build one big wearables array
  for (const collectionId of collectionIds) {
    const file = path.join(collectionsDir, `${collectionId}.json`);
    let data;
    try {
      data = await fs.readFile(file, "utf-8");
    } catch (err) {
      console.error("Cannot read file: " + err);
    }
    const items = JSON.parse(data);
    for (const item of items) {
      const wearable = {};
      wearable.id = `${collectionId}_${item.id}`;
      wearable.name = item.name;
      wearable.image = item.image;
      wearable.description = item.description;
      wearable.issues = findItemTrait(item, "issues") + "";
      wearable.rarity = findItemTrait(item, "rarity");
      wearable.year = findItemTrait(item, "year");
      wearable.author = findItemTrait(item, "author");
      wearable.vox = findItemTrait(item, "vox");
      wearable.glb = findItemTrait(item, "glb");
      wearable.externalUrl = item.external_url;
      wearable.tokenId = item.id;
      wearable.collectionId = collectionId;
      // TODO: not all collections have images
      // need to consult tmp/collection_icons_manifest.json and set null when none
      wearable.collectionImage = `https://arweave.net/YgdXdtgECPF5wcOpVgKVHqgYTVdayKGdq-KQoQS7LqY/${collectionId}.png`;
      wearable.collectionName = findItemTrait(item, "collection");
      wearables.push(wearable);
      // TODO: accumulate and count all traits/attributes so we can see whats missing etc
    }
  }
  // create wearables.js
  const js = `var wearables = ${JSON.stringify(wearables, null, 2)}`;
  const outFile = path.join("./wearables.js");
  await fs.writeFile(outFile, js, "utf-8");
}

function findItemTrait(item, type) {
  return item.attributes.find((attr) => attr.trait_type === type).value;
}

async function dirExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

generate();
