# Sandbox

Use to `confirm` the `shapes` of the **requests** xmApi expects and the **reponses** it returns.

## Setup

1. Create a gitIgnored `.env` file
   ```sh
   cp .env.example .env
   ```

2. Edit the `.env` file with your actual xMatters credentials

## Usage

```sh
deno run --allow-net --allow-read --allow-env index.ts
```
