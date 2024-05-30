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
  const collections = [];
  const wearables = [];
  for (const collectionId of collectionIds) {
    const file = path.join(collectionsDir, `${collectionId}.json`);
    let data;
    try {
      data = await fs.readFile(file, "utf-8");
    } catch (err) {
      console.error("Cannot read file: " + err);
    }
    const items = JSON.parse(data);
    if (!items.length) {
      // console.log("skipping collection, no wearables");
      continue;
    }
    const collection = {
      id: collectionId,
      name: findItemTrait(items[0], "collection"),
      // TODO: not all collections have images
      // need to consult tmp/collection_icons_manifest.json and set null when none
      hasImage: true,
      // TODO: image is derived from base url and id in html file
      // image: `https://arweave.net/YgdXdtgECPF5wcOpVgKVHqgYTVdayKGdq-KQoQS7LqY/${collectionId}.png`,
    };
    collections.push(collection);
    for (const item of items) {
      // check for collection name inconsistencies
      const collectionName = findItemTrait(item, "collection");
      if (collection.name !== collectionName) {
        console.log(
          `collection name inconsistency: ${collection.name} -> ${collectionName}`
        );
      }
      // make wearable
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
      wearables.push(wearable);
      // TODO: accumulate and count all traits/attributes so we can see whats missing etc
    }
  }
  // create wearables.js
  // TODO: remove pretty print for smaller file
  const wearablesStr = safeStringify(wearables);
  const collectionsStr = safeStringify(collections);
  const js = `var db = { wearables: ${wearablesStr}, collections: ${collectionsStr} }`;
  const outFile = path.join("./db.js");
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

function safeStringify(data) {
  // vscode was showing ambiguous unicode characters and this fixes them
  let str = JSON.stringify(data, null, 2);
  // normalize newlines to \n
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // replace non-breaking spaces with regular spaces
  str = str.replace(/\u00A0/g, " ");
  // remove other ambiguous unicode characters
  str = str.replace(/[^\x00-\x7F]/g, "");
  return str;
}

generate();
