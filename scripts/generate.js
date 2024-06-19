const fs = require("fs").promises;
const path = require("path");

const wearablesDir = path.join("./wearables");
const dbFile = path.join("./db.js");

const stats = {
  rarity: {
    // eg legendary: 10
  },
};

const run = async () => {
  const wearables = [];
  const collectionsById = new Map();
  const fileNames = await fs.readdir(wearablesDir);
  let emptyCount = 0;
  for (let i = 0; i < fileNames.length; i++) {
    const fileName = fileNames[i];
    const file = path.join(wearablesDir, fileName);
    const raw = await fs.readFile(file, "utf-8");
    const empty = raw.trim().length === 0;
    if (empty) {
      // console.log("found empty file", file);
      emptyCount++;
      continue;
    }
    const meta = JSON.parse(raw);
    const id = fileName.split(".json")[0];
    const [collectionId, tokenId] = id.split("_");
    const wearable = {
      id,
      name: meta.name,
      image: meta.image,
      description: meta.description,
      issues: getTrait(meta, "issues"),
      rarity: getTrait(meta, "rarity"),
      year: getTrait(meta, "year"),
      author: getTrait(meta, "author"),
      vox: getTrait(meta, "vox"),
      svox: getTrait(meta, "svox"),
      glb: getTrait(meta, "glb"),
      extras: getSecondaryTraits(meta),
      externalUrl: meta.external_url,
      tokenId,
      collectionId,
    };
    if (!stats.rarity[wearable.rarity]) {
      stats.rarity[wearable.rarity] = 0;
    }
    stats.rarity[wearable.rarity]++;
    wearables.push(wearable);
    let collection = collectionsById.get(collectionId);
    if (collection) {
      const name = getTrait(meta, "collection");
      if (collection.name !== name) {
        console.log(
          `collection name mismatch: '${collection.name}' vs ${name}`
        );
      }
    } else {
      collection = {
        id: collectionId,
        name: getTrait(meta, "collection"),
        hasImage: true,
        // TODO: hasImage
      };
      collectionsById.set(collection.id, collection);
    }
  }
  const collections = Array.from(collectionsById.values());
  collections.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  const wearablesStr = safeStringify(wearables);
  const collectionsStr = safeStringify(collections);
  const js = `var db = { wearables: ${wearablesStr}, collections: ${collectionsStr} }`;
  await fs.writeFile(dbFile, js, "utf-8");
  console.log(`found ${emptyCount} empty json files`);
  console.log("stats", stats);
};

run();

const getTrait = (meta, name) => {
  return meta.attributes.find((attr) => attr.trait_type === name).value;
};

const primaryTraits = [
  "collection",
  "issues",
  "rarity",
  "year",
  "author",
  "vox",
  "svox",
  "glb",
];

const getSecondaryTraits = (meta) => {
  const traits = meta.attributes
    .filter((item) => {
      const isSecondary = !primaryTraits.includes(item.trait_type);
      const isValid = item.trait_type && item.value;
      return isSecondary && isValid;
    })
    .map((item) => {
      return {
        name: item.trait_type,
        value: item.value,
      };
    });
  if (traits.length) console.log(meta.name, traits);
  return traits;
};

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
