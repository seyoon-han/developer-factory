# Theia IDE Integration

This directory contains the Eclipse Theia IDE configuration for the Dev Automation Board.

## Setup (Local Development)

```bash
cd theia-ide
npm install
npm run build
npm start
```

Theia will start on http://localhost:3100

## Docker

In Docker, Theia is built and managed automatically. No manual setup required.

## Configuration

- `package.json` - Theia dependencies and scripts
- `.theia/settings.json` - Default IDE settings
- `tsconfig.json` - TypeScript configuration

## Customization

### Add Extensions

Edit `package.json` and add more Theia packages:
```json
"dependencies": {
  "@theia/your-extension": "1.66.2"
}
```

Then rebuild:
```bash
npm install
npm run build
```

### Change Settings

Edit `.theia/settings.json` to customize:
- Theme
- Font size
- Auto-save behavior
- Git settings
- Terminal preferences

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules
npm install
npm run build
```

### Port Already in Use

```bash
# Change port in package.json
"start": "theia start --port=3101"
```

---

**Managed by:** Dev Automation Board
**Version:** Based on Theia 1.66.2

