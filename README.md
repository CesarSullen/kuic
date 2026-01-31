# Collector - Bet Collection Tool

## Description

An **offline-first**, **privacy-first**, and **local-first** tool built specifically for bet collectors ("listeros").  
It lets you quickly register and organize daily bets and export the data in JSON format for later processing or accounting.

## Features

- Client registration with automatic timestamp capture
- Separate handling of **fijos** (straight bets) and **corridos** (parlay/chain bets)
- Automatic number validation (only allows 00–99)
- Smart formatting: turns "5" → "05", "7" → "07", etc.
- Real-time calculations: totals per bet type + grand total
- JSON export including collector name, date & metadata
- **Full persistence** — data survives browser/tab/app closure
- 100% **offline** support (powered by Local Storage + Cache Storage)
- Installable **PWA** — works offline and can be added to home screen
- Native file sharing via Web Share API (easy to send the .json file)

## Privacy and Data

All your data stays **exclusively on your device** (Local Storage + Cache Storage).  
Nothing is ever sent to any external server.  
You are in full control — share the JSON file only when _you_ want to, using your device's native share menu.

## Technologies

- HTML5, CSS3 & Vanilla JavaScript (no frameworks)
- Service Worker → offline support & asset caching
- Local Storage → persistent storage of bets & collector settings
- Web Share API → native file sharing from the browser
- Web App Manifest → proper PWA install experience

## Try Collector

You can try the application live here:  
→ [cesarsullen.github.io/collector](https://cesarsullen.github.io/collector)

Hope it makes your daily workflow much smoother! <3

## License

Licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.
