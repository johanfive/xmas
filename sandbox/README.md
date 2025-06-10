# Sandbox

Edit the `index.ts` file for quick prototyping
and **confirming** the **shapes** of **requests** xmApi expects and the **reponses** it returns.

## Setup

1. Copy the environment configuration:
   ```sh
   cp .env.example .env
   ```
   The `.env` file is automatically gitignored to keep your credentials safe.

2. Edit the `.env` file with your actual xMatters credentials:
   - `HOSTNAME`: Your xMatters instance hostname (without `https://`)
   - `USERNAME`: Your xMatters username
   - `PASSWORD`: Your xMatters password
   - `CLIENT_ID`: Your OAuth client ID (if using OAuth)

## Usage

Run the example:
```sh
deno run --allow-net --allow-read --allow-env index.ts
```
