# Voxels Wearable Explorer

A static site for exploring voxels wearables (formerly cryptovoxels)

## Install

Run `npm install` to install deps

## Download

Run `npm run download`

This reads the `manifest.json` file which is the source of truth for all wearables and includes links to their json files.
For example `1/1001.json` corresponds to collection `1` and wearable `1001`.

Each wearable is downloaded to `/wearables/{collection}_{wearable}.json`

## Generate

Run `npm run generate`

This generates a `db.js` file, which is essentially a combined, compact version of all the json files you downloaded in the previous step.

The `db.js` file is then loaded by the static website and used as an in-browser database.

## Development

Run `npm run serve` to view in the browser.

The static website then imports `db.js` and uses this for client-side queries.

## Deployment

Simply serve the `index.html` and accompanying files in the root of this repo, as a static website.

Ideally serve somewhere that support g-zip, since the ~26 MB `db.js` file g-zipped is only ~6 MB
